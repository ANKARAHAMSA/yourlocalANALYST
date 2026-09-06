"""
Secure code sandbox: AST-based validator + restricted executor.
Blocks dangerous imports and system-level calls before any code runs.
"""
import ast
import io
import sys
import traceback
from contextlib import redirect_stdout, redirect_stderr
from typing import Any

# Modules that are forbidden in AI-generated code
BLOCKED_IMPORTS = {
    "os", "sys", "subprocess", "socket", "shutil", "pathlib",
    "importlib", "ctypes", "multiprocessing", "threading",
    "pickle", "shelve", "marshal", "builtins", "signal",
    "__builtins__", "eval", "exec", "compile", "open",
    "requests", "urllib", "http", "ftplib", "smtplib",
}

BLOCKED_BUILTINS = {"eval", "exec", "compile", "open", "__import__"}


class SecurityError(Exception):
    pass


class ImportBlocker(ast.NodeVisitor):
    """AST visitor that raises SecurityError on any blocked import."""

    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            root_module = alias.name.split(".")[0]
            if root_module in BLOCKED_IMPORTS:
                raise SecurityError(
                    f"Import of '{alias.name}' is not allowed for security reasons."
                )
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        if node.module:
            root_module = node.module.split(".")[0]
            if root_module in BLOCKED_IMPORTS:
                raise SecurityError(
                    f"Import from '{node.module}' is not allowed for security reasons."
                )
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call):
        # Block direct calls to eval/exec/compile/open
        if isinstance(node.func, ast.Name) and node.func.id in BLOCKED_BUILTINS:
            raise SecurityError(
                f"Call to '{node.func.id}' is not allowed for security reasons."
            )
        self.generic_visit(node)


def validate_code(code: str) -> None:
    """Parse and validate code via AST. Raises SecurityError if unsafe."""
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        raise SyntaxError(f"Syntax error in generated code: {e}") from e
    ImportBlocker().visit(tree)


def execute_python(code: str, conn, extra_globals: dict = None) -> dict[str, Any]:
    """
    Safely execute AI-generated Python code in a restricted environment.
    Returns dict with keys: success, result_df, stdout, error
    """
    validate_code(code)

    # Build a safe, minimal global namespace (Python 3.13 compatible)
    import builtins as _builtins_module
    import pandas as pd
    import duckdb

    safe_builtins = {
        name: getattr(_builtins_module, name)
        for name in dir(_builtins_module)
        if name not in BLOCKED_BUILTINS
    }
    # __import__ is needed for Python's internal exec machinery.
    # Actual import statements are already blocked at AST level above.
    safe_builtins["__import__"] = getattr(_builtins_module, "__import__")

    safe_globals = {
        "__builtins__": safe_builtins,
        "pd": pd,
        "duckdb": duckdb,
        "conn": conn,
        "result_df": None,
    }
    if extra_globals:
        safe_globals.update(extra_globals)

    stdout_buf = io.StringIO()
    stderr_buf = io.StringIO()

    try:
        with redirect_stdout(stdout_buf), redirect_stderr(stderr_buf):
            exec(compile(code, "<agent_code>", "exec"), safe_globals)  # noqa: S102

        result_df = safe_globals.get("result_df")
        return {
            "success": True,
            "result_df": result_df,
            "stdout": stdout_buf.getvalue(),
            "error": None,
        }
    except Exception:
        return {
            "success": False,
            "result_df": None,
            "stdout": stdout_buf.getvalue(),
            "error": traceback.format_exc(),
        }


def execute_sql(sql: str, conn) -> dict[str, Any]:
    """Execute a DuckDB SQL query. Returns dict with success, result_df, error."""
    try:
        result_df = conn.execute(sql).df()
        return {"success": True, "result_df": result_df, "error": None}
    except Exception:
        return {
            "success": False,
            "result_df": None,
            "error": traceback.format_exc(),
        }
