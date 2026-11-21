"""Groq-powered PDF research-paper analysis routes."""
import json
from flask import Blueprint, request, jsonify, session
from app.groq_utils import groq_chat
from database.db_connection import get_connection

reader_bp = Blueprint("reader", __name__, url_prefix="/api/reader")
FIELDS = [
    "paper_overview", "research_summary", "problem_statement", "research_gap",
    "research_objectives", "methodology", "dataset_and_experiments", "key_findings",
    "advantages", "limitations", "applications", "future_scope", "novel_contribution",
    "simple_explanation", "critical_review", "important_metrics", "technical_terms"
]
MISSING = "Not stated in the provided paper text."


def _analysis_prompt(paper_text):
    return (
        "Analyze the supplied research paper itself, not the act of extracting text. "
        "Use only evidence in the supplied text; never invent facts, results, datasets, citations or metrics. "
        "Return one valid JSON object with these keys: " + json.dumps(FIELDS) + ". "
        "Also include paper_title (string) and is_research_paper (boolean). "
        "research_summary must be a coherent, detailed 2-4 paragraph plain-language summary covering "
        "the research problem, objective, approach, important results and conclusion. "
        "Each other field must contain a useful detailed string; important_metrics and technical_terms "
        "may be arrays. For every unsupported or absent detail use exactly: '" + MISSING + "'. "
        "Preserve all numerical values with their units and context. Clearly separate authors' claims from critique.\n\n"
        "PAPER TEXT:\n" + paper_text[:90000]
    )


@reader_bp.post("/analyze")
def analyze():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify(success=False, error="Please log in to analyze and save papers."), 401

    data = request.get_json(silent=True) or {}
    paper_text = (data.get("text") or "").strip()
    filename = (data.get("filename") or "Uploaded paper.pdf")[:255]
    if len(paper_text) < 250:
        return jsonify(success=False, error="Only a small amount of text was extracted. This PDF may be scanned; try OCR or another copy."), 400

    try:
        response = groq_chat({
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": "You are a rigorous academic research-paper analyst. Return valid JSON only. Never fabricate."},
                {"role": "user", "content": _analysis_prompt(paper_text)}
            ],
            "max_tokens": 7000
        }, timeout=150)

        choices = response.get("choices") or []
        if not choices:
            raise RuntimeError("Groq returned an empty response. Please retry.")
        content = (choices[0].get("message") or {}).get("content")
        if not content:
            raise RuntimeError("Groq returned no analysis text. Please retry.")
        try:
            result = json.loads(content)
        except json.JSONDecodeError as exc:
            raise RuntimeError("Groq returned an incomplete analysis. Please retry with a shorter PDF.") from exc
        if not isinstance(result, dict):
            raise RuntimeError("Groq returned an invalid analysis format. Please retry.")
        if not result.get("research_summary") and not result.get("paper_overview"):
            raise RuntimeError("Groq did not return a paper summary. Please retry.")

        # A database/history outage must not discard a successful Groq analysis.
        history_saved = False
        connection = None
        cursor = None
        try:
            connection = get_connection()
            cursor = connection.cursor()
            cursor.execute(
                "INSERT INTO paper_analyses(user_id,filename,paper_title,analysis_json) VALUES(%s,%s,%s,%s)",
                (user_id, filename, result.get("paper_title", ""), json.dumps(result, ensure_ascii=False))
            )
            connection.commit()
            history_saved = True
        except Exception as db_error:
            print(f"PDF analysis history was not saved: {db_error}")
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

        return jsonify(success=True, analysis=result, history_saved=history_saved)
    except Exception as error:
        print(f"PDF/Groq analysis failed: {error}")
        return jsonify(success=False, error=str(error)), 503


@reader_bp.get("/history")
def history():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify(success=False, error="Please log in."), 401
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            "SELECT id,filename,paper_title,created_at FROM paper_analyses WHERE user_id=%s ORDER BY id DESC LIMIT 30",
            (user_id,)
        )
        return jsonify(success=True, data=cursor.fetchall())
    except Exception as error:
        return jsonify(success=False, error=f"Could not load analysis history: {error}"), 503
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
