from pydantic import BaseModel
from typing import Any, Optional


class UploadResponse(BaseModel):
    session_id: str
    tables: list[str]
    schemas: dict[str, list[dict]]
    sample_rows: dict[str, list[dict]]
    eda_summary: str
    suggested_questions: list[str]


class AnalyzeRequest(BaseModel):
    session_id: str
    question: str
    history: Optional[list[dict]] = []


class ChartSpec(BaseModel):
    data: list[dict]
    layout: dict
    config: Optional[dict] = {"displayModeBar": True, "responsive": True}


class AnalyzeResponse(BaseModel):
    answer: str
    code: Optional[str] = None
    code_language: Optional[str] = "sql"
    chart: Optional[ChartSpec] = None
    insights: Optional[list[str]] = []
    attempts: int = 1
    error: Optional[str] = None


class ExportRequest(BaseModel):
    session_id: str
    history: list[dict]
