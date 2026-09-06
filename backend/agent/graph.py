"""
LangGraph self-healing agent loop.

State machine flow:
  planner → executor → validator → insight_generator
                ↑           |
                └── reflector (on error or empty result, max 3 retries)
"""
import json
from typing import TypedDict, Optional, Any
from langgraph.graph import StateGraph, END

import google.generativeai as genai

from agent.prompts import PLANNER_SYSTEM_PROMPT, REFLECTOR_SYSTEM_PROMPT, INSIGHT_SYSTEM_PROMPT
from agent.sandbox import execute_sql, execute_python, SecurityError
from agent.eda import build_schema_string

MAX_RETRIES = 3


# ──────────────────────────────────────────────
# Agent State
# ──────────────────────────────────────────────
class AgentState(TypedDict):
    question: str
    schemas: dict
    conn: Any  # DuckDB connection
    gemini_model: Any

    # Code generation
    code: Optional[str]
    code_language: Optional[str]
    chart_type: Optional[str]
    chart_x: Optional[str]
    chart_y: Optional[str]
    chart_color: Optional[str]
    chart_title: Optional[str]

    # Execution
    result_df: Optional[Any]
    error: Optional[str]
    attempts: int

    # Output
    narrative: Optional[str]
    insights: Optional[list]
    chart_spec: Optional[dict]

    # Streaming callback
    on_step: Optional[Any]


# ──────────────────────────────────────────────
# Helper: Parse LLM JSON response
# ──────────────────────────────────────────────
def _parse_llm_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


import time

def _generate_with_retry(model, prompt: str, on_step=None, max_attempts: int = 4):
    """
    Execute Gemini model generate_content with exponential backoff on 429 rate limits.
    """
    for attempt in range(1, max_attempts + 1):
        try:
            return model.generate_content(prompt)
        except Exception as e:
            err_str = str(e)
            is_rate_limit = "429" in err_str or "quota" in err_str.lower() or "resource" in err_str.lower()
            if is_rate_limit and attempt < max_attempts:
                wait_sec = attempt * 3
                if on_step:
                    on_step(f"⏳ Rate limit buffer active — pausing {wait_sec}s for API quota...")
                time.sleep(wait_sec)
            else:
                raise e


# ──────────────────────────────────────────────
# Node 1: Planner — generates code from question
# ──────────────────────────────────────────────
def planner_node(state: AgentState) -> AgentState:
    if state.get("on_step"):
        state["on_step"]("🧠 Planning query...")

    schema_str = build_schema_string(state["schemas"])
    prompt = PLANNER_SYSTEM_PROMPT.format(schema=schema_str)

    model = state["gemini_model"]
    response = _generate_with_retry(
        model,
        f"{prompt}\n\n## User Question\n{state['question']}",
        on_step=state.get("on_step"),
    )

    parsed = _parse_llm_json(response.text)

    return {
        **state,
        "code": parsed.get("code", ""),
        "code_language": parsed.get("code_language", "sql"),
        "chart_type": parsed.get("chart_type", "none"),
        "chart_x": parsed.get("chart_x"),
        "chart_y": parsed.get("chart_y"),
        "chart_color": parsed.get("chart_color"),
        "chart_title": parsed.get("chart_title", "Analysis Result"),
        "error": None,
    }


# ──────────────────────────────────────────────
# Node 2: Executor — runs the code in sandbox
# ──────────────────────────────────────────────
def executor_node(state: AgentState) -> AgentState:
    attempt = state.get("attempts", 0) + 1
    if state.get("on_step"):
        state["on_step"](
            f"⚙️ Executing code (attempt {attempt}/{MAX_RETRIES})..."
        )

    conn = state["conn"]
    code = state["code"]
    lang = state["code_language"]

    if lang == "sql":
        result = execute_sql(code, conn)
    else:
        result = execute_python(code, conn)

    return {
        **state,
        "result_df": result.get("result_df"),
        "error": result.get("error"),
        "attempts": attempt,
    }


# ──────────────────────────────────────────────
# Node 3: Reflector — diagnoses errors, rewrites
# ──────────────────────────────────────────────
def reflector_node(state: AgentState) -> AgentState:
    if state.get("on_step"):
        state["on_step"](
            f"🔄 Self-correcting (attempt {state['attempts']}/{MAX_RETRIES})..."
        )

    schema_str = build_schema_string(state["schemas"])
    prompt = REFLECTOR_SYSTEM_PROMPT.format(
        question=state["question"],
        schema=schema_str,
        language=state["code_language"],
        code=state["code"],
        error=state["error"] or "Result was empty or invalid.",
    )

    model = state["gemini_model"]
    response = _generate_with_retry(model, prompt, on_step=state.get("on_step"))
    parsed = _parse_llm_json(response.text)

    return {
        **state,
        "code": parsed.get("code", state["code"]),
        "code_language": parsed.get("code_language", state["code_language"]),
        "chart_type": parsed.get("chart_type", state["chart_type"]),
        "chart_x": parsed.get("chart_x", state["chart_x"]),
        "chart_y": parsed.get("chart_y", state["chart_y"]),
        "chart_color": parsed.get("chart_color", state["chart_color"]),
        "chart_title": parsed.get("chart_title", state["chart_title"]),
        "error": None,
    }


# ──────────────────────────────────────────────
# Node 4: Insight Generator — builds chart + narrative
# ──────────────────────────────────────────────
def insight_node(state: AgentState) -> AgentState:
    if state.get("on_step"):
        state["on_step"]("✨ Generating insights and chart...")

    df = state["result_df"]
    chart_spec = None

    if df is not None and not df.empty:
        chart_type = state.get("chart_type", "bar")
        chart_x = state.get("chart_x")
        chart_y = state.get("chart_y")
        chart_color = state.get("chart_color")
        chart_title = state.get("chart_title", "Analysis Result")

        # Build Plotly trace
        try:
            trace = _build_plotly_trace(df, chart_type, chart_x, chart_y, chart_color)
            chart_spec = {
                "data": [trace],
                "layout": {
                    "title": {"text": chart_title, "font": {"size": 18}},
                    "template": "plotly_dark",
                    "paper_bgcolor": "#1a1a2e",
                    "plot_bgcolor": "#16213e",
                    "font": {"color": "#e0e0e0"},
                    "xaxis": {"gridcolor": "#2a2a4a"},
                    "yaxis": {"gridcolor": "#2a2a4a"},
                    "margin": {"l": 60, "r": 30, "t": 60, "b": 60},
                },
                "config": {"displayModeBar": True, "responsive": True},
            }
        except Exception:
            chart_spec = None

        # Generate narrative insights
        try:
            result_sample = df.head(10).to_markdown(index=False)
        except Exception:
            result_sample = df.head(10).to_string(index=False)
        prompt = INSIGHT_SYSTEM_PROMPT.format(
            question=state["question"],
            result_sample=result_sample,
            chart_title=chart_title,
        )
        try:
            model = state["gemini_model"]
            response = _generate_with_retry(model, prompt, on_step=state.get("on_step"))
            parsed = _parse_llm_json(response.text)
            narrative = parsed.get("narrative", "")
            insights = parsed.get("insights", [])
        except Exception:
            narrative = "Analysis complete."
            insights = []
    else:
        narrative = "The query returned no results. Try rephrasing your question."
        insights = []

    return {
        **state,
        "narrative": narrative,
        "insights": insights,
        "chart_spec": chart_spec,
    }


def _build_plotly_trace(df, chart_type: str, x_col, y_col, color_col) -> dict:
    """Build a Plotly trace dict from a DataFrame."""
    # Fallback to first columns if hints are missing or invalid
    cols = list(df.columns)
    if x_col not in cols:
        x_col = cols[0] if cols else None
    if y_col not in cols:
        numeric_cols = df.select_dtypes("number").columns.tolist()
        y_col = numeric_cols[0] if numeric_cols else (cols[1] if len(cols) > 1 else cols[0])

    x_data = df[x_col].tolist() if x_col else []
    y_data = df[y_col].tolist() if y_col else []

    type_map = {
        "bar": "bar",
        "line": "scatter",
        "scatter": "scatter",
        "pie": "pie",
        "histogram": "histogram",
    }
    plotly_type = type_map.get(chart_type, "bar")

    trace: dict = {"type": plotly_type}

    if plotly_type == "pie":
        trace["labels"] = x_data
        trace["values"] = y_data
        trace["hole"] = 0.3
    elif plotly_type == "histogram":
        trace["x"] = x_data
        trace["marker"] = {"color": "#6c63ff"}
    elif plotly_type == "scatter":
        trace["x"] = x_data
        trace["y"] = y_data
        trace["mode"] = "lines+markers" if chart_type == "line" else "markers"
        trace["marker"] = {"color": "#6c63ff", "size": 8}
        trace["line"] = {"color": "#6c63ff", "width": 2}
    else:  # bar
        trace["x"] = x_data
        trace["y"] = y_data
        trace["marker"] = {"color": "#6c63ff"}

    if color_col and color_col in df.columns and plotly_type in ("scatter", "bar"):
        # Color grouping — emit multiple traces grouped by color column
        pass  # For simplicity, single-color trace; extend for grouped bars

    return trace


# ──────────────────────────────────────────────
# Routing conditions
# ──────────────────────────────────────────────
def should_retry(state: AgentState) -> str:
    """After executor: decide to retry (reflect) or proceed to insights."""
    has_error = bool(state.get("error"))
    result_empty = (
        state.get("result_df") is None
        or (hasattr(state.get("result_df"), "empty") and state["result_df"].empty)
    )
    max_hit = state.get("attempts", 0) >= MAX_RETRIES

    if (has_error or result_empty) and not max_hit:
        return "reflector"
    return "insight"


# ──────────────────────────────────────────────
# Build the LangGraph graph
# ──────────────────────────────────────────────
def build_agent_graph():
    graph = StateGraph(AgentState)

    graph.add_node("planner", planner_node)
    graph.add_node("executor", executor_node)
    graph.add_node("reflector", reflector_node)
    graph.add_node("insight", insight_node)

    graph.set_entry_point("planner")
    graph.add_edge("planner", "executor")
    graph.add_conditional_edges("executor", should_retry, {
        "reflector": "reflector",
        "insight": "insight",
    })
    graph.add_edge("reflector", "executor")
    graph.add_edge("insight", END)

    return graph.compile()


# Singleton compiled graph
AGENT_GRAPH = build_agent_graph()
