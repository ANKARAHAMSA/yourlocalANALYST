"""
Auto-EDA engine: generates instant schema profiles, statistics,
executive summaries, and suggested questions for uploaded datasets.
"""
import json
import duckdb
import google.generativeai as genai

from agent.prompts import EDA_SYSTEM_PROMPT


def get_table_schema(conn: duckdb.DuckDBPyConnection, table_name: str) -> list[dict]:
    """Return column names and types for a table."""
    result = conn.execute(f"DESCRIBE {table_name}").fetchall()
    return [{"column": row[0], "type": row[1]} for row in result]


def get_sample_rows(
    conn: duckdb.DuckDBPyConnection, table_name: str, n: int = 5
) -> list[dict]:
    """Return n sample rows as a list of dicts."""
    df = conn.execute(f"SELECT * FROM {table_name} LIMIT {n}").df()
    return df.to_dict(orient="records")


def get_column_stats(
    conn: duckdb.DuckDBPyConnection, table_name: str, schema: list[dict]
) -> dict:
    """Compute basic stats per column using DuckDB SUMMARIZE."""
    try:
        summary = conn.execute(f"SUMMARIZE {table_name}").df()
        return summary.to_dict(orient="records")
    except Exception:
        return {}


def build_schema_string(schemas: dict[str, list[dict]]) -> str:
    """Build a human-readable schema block for LLM prompts."""
    lines = []
    for table, cols in schemas.items():
        lines.append(f"Table: `{table}`")
        for col in cols:
            lines.append(f"  - {col['column']} ({col['type']})")
    return "\n".join(lines)


async def run_eda(
    conn: duckdb.DuckDBPyConnection,
    table_names: list[str],
    gemini_model,
) -> dict:
    """
    Run auto-EDA on all loaded tables.
    Returns: {summary, questions, schemas, sample_rows}
    """
    schemas = {}
    sample_rows = {}
    all_stats = {}

    for table in table_names:
        schemas[table] = get_table_schema(conn, table)
        sample_rows[table] = get_sample_rows(conn, table)
        all_stats[table] = get_column_stats(conn, table, schemas[table])

    schema_str = build_schema_string(schemas)
    sample_str = json.dumps(sample_rows, default=str, indent=2)[:3000]  # cap size
    stats_str = json.dumps(all_stats, default=str, indent=2)[:2000]

    prompt = EDA_SYSTEM_PROMPT.format(
        schema=schema_str,
        sample=sample_str,
        stats=stats_str,
    )

    try:
        response = gemini_model.generate_content(prompt)
        raw = response.text.strip()
        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw)
        summary = parsed.get("summary", "Dataset loaded successfully.")
        questions = parsed.get("questions", [])
    except Exception as e:
        summary = "Dataset loaded successfully. Ask me anything about your data!"
        questions = [
            "What are the top 10 rows by the most important numeric column?",
            "Show me the distribution of values in the main category column.",
            "Are there any missing or null values in the dataset?",
            "What are the correlations between numeric columns?",
            "Show me a summary of all columns.",
        ]

    return {
        "summary": summary,
        "questions": questions,
        "schemas": schemas,
        "sample_rows": sample_rows,
    }
