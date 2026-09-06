"""
Upload router: accepts CSV files, loads them into per-session DuckDB databases,
and runs auto-EDA to return schemas, samples, summaries, and suggested questions.
"""
import os
import uuid
import re
import duckdb
import aiofiles
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List

import google.generativeai as genai

from agent.eda import run_eda
from models.schemas import UploadResponse

router = APIRouter()

# In-memory session store: session_id -> DuckDB connection
SESSION_STORE: dict[str, duckdb.DuckDBPyConnection] = {}


def _sanitize_table_name(filename: str) -> str:
    """Convert filename to a safe DuckDB table name."""
    name = os.path.splitext(filename)[0]
    name = re.sub(r"[^a-zA-Z0-9_]", "_", name)
    name = re.sub(r"_+", "_", name).strip("_").lower()
    if name[0].isdigit():
        name = f"t_{name}"
    return name or "uploaded_data"


@router.post("/upload", response_model=UploadResponse)
async def upload_files(files: List[UploadFile] = File(...)):
    """
    Accept one or more CSV files, load into DuckDB, run EDA.
    Returns session_id + schema + EDA results.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    session_id = str(uuid.uuid4())
    conn = duckdb.connect(database=":memory:")
    SESSION_STORE[session_id] = conn

    table_names = []

    for upload in files:
        if not upload.filename.lower().endswith(".csv"):
            raise HTTPException(
                status_code=400,
                detail=f"Only CSV files are supported. Got: {upload.filename}",
            )

        table_name = _sanitize_table_name(upload.filename)
        # Handle duplicate table names
        base_name = table_name
        counter = 1
        while table_name in table_names:
            table_name = f"{base_name}_{counter}"
            counter += 1

        # Write to temp file and load into DuckDB
        content = await upload.read()
        with tempfile.NamedTemporaryFile(
            suffix=".csv", delete=False, mode="wb"
        ) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            conn.execute(
                f"CREATE TABLE {table_name} AS SELECT * FROM read_csv_auto('{tmp_path}', HEADER=TRUE)"
            )
            table_names.append(table_name)
        except Exception as e:
            raise HTTPException(
                status_code=422,
                detail=f"Failed to parse '{upload.filename}': {str(e)}",
            )
        finally:
            os.unlink(tmp_path)

    # Get Gemini model from app state
    from main import gemini_model
    eda_result = await run_eda(conn, table_names, gemini_model)

    return UploadResponse(
        session_id=session_id,
        tables=table_names,
        schemas=eda_result["schemas"],
        sample_rows=eda_result["sample_rows"],
        eda_summary=eda_result["summary"],
        suggested_questions=eda_result["questions"],
    )
