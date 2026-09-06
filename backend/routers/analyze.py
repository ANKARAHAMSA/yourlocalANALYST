"""
Analyze router: receives user questions, runs the LangGraph self-healing agent,
and streams progress events back to the frontend via Server-Sent Events (SSE).
"""
import json
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from agent.graph import AGENT_GRAPH
from agent.eda import get_table_schema
from models.schemas import AnalyzeRequest
from routers.upload import SESSION_STORE

router = APIRouter()


def _get_session(session_id: str):
    conn = SESSION_STORE.get(session_id)
    if not conn:
        raise HTTPException(
            status_code=404,
            detail="Session not found. Please upload a file first.",
        )
    return conn


@router.post("/analyze")
async def analyze(request: AnalyzeRequest):
    """
    Run the self-healing agent and stream progress events via SSE.

    SSE event types:
      - step  : intermediate status message
      - result: final JSON payload with code, chart, narrative, insights
      - error : fatal error message
    """
    conn = _get_session(request.session_id)
    from main import gemini_model

    table_names = [row[0] for row in conn.execute("SHOW TABLES").fetchall()]
    schemas = {t: get_table_schema(conn, t) for t in table_names}

    # Shared queue: agent pushes steps, generator reads them
    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def on_step(msg: str):
        """Called from the agent thread — safely puts message in asyncio queue."""
        loop.call_soon_threadsafe(queue.put_nowait, msg)

    def run_agent() -> dict:
        initial_state = {
            "question": request.question,
            "schemas": schemas,
            "conn": conn,
            "gemini_model": gemini_model,
            "code": None,
            "code_language": "sql",
            "chart_type": "bar",
            "chart_x": None,
            "chart_y": None,
            "chart_color": None,
            "chart_title": "Analysis Result",
            "result_df": None,
            "error": None,
            "attempts": 0,
            "narrative": None,
            "insights": [],
            "chart_spec": None,
            "on_step": on_step,
        }
        return AGENT_GRAPH.invoke(initial_state)

    async def event_stream():
        # Sentinel value to mark agent completion
        DONE = object()

        async def _run_and_signal():
            try:
                result = await asyncio.to_thread(run_agent)
                await queue.put(result)   # put final state dict
            except Exception as exc:
                await queue.put(exc)       # put exception so we can surface it

        # Start agent as background task
        task = asyncio.create_task(_run_and_signal())

        try:
            while True:
                item = await asyncio.wait_for(queue.get(), timeout=120)

                if isinstance(item, Exception):
                    yield f"event: error\ndata: {json.dumps({'error': str(item)})}\n\n"
                    break

                if isinstance(item, dict):
                    # Final state received — build and yield result event
                    df = item.get("result_df")
                    table_data = None
                    if df is not None and not df.empty:
                        table_data = {
                            "columns": list(df.columns),
                            "rows": df.head(100).to_dict(orient="records"),
                        }

                    result_payload = {
                        "answer": item.get("narrative", "Analysis complete."),
                        "code": item.get("code"),
                        "code_language": item.get("code_language", "sql"),
                        "chart": item.get("chart_spec"),
                        "insights": item.get("insights", []),
                        "attempts": item.get("attempts", 1),
                        "table": table_data,
                        "error": (
                            item.get("error")
                            if not item.get("narrative")
                            else None
                        ),
                    }
                    yield f"event: result\ndata: {json.dumps(result_payload, default=str)}\n\n"
                    break

                # It's a step message string
                yield f"event: step\ndata: {json.dumps({'message': item})}\n\n"

        except asyncio.TimeoutError:
            yield f"event: error\ndata: {json.dumps({'error': 'Agent timed out after 120s.'})}\n\n"
        finally:
            task.cancel()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
