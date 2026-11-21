from flask import Blueprint, jsonify, request
from app.models.paper import search_papers, get_paper_by_id, get_filter_options, get_stats

papers_bp = Blueprint("papers_bp", __name__, url_prefix="/api")


def _validate_int_param(value, name, min_val=None, max_val=None, default=None):
    """Parse and validate an integer query parameter. Returns (value, error_string)."""
    if value is None:
        return default, None
    try:
        v = int(value)
    except (ValueError, TypeError):
        return None, f"'{name}' must be an integer"
    if min_val is not None and v < min_val:
        return None, f"'{name}' must be >= {min_val}"
    if max_val is not None and v > max_val:
        return None, f"'{name}' must be <= {max_val}"
    return v, None


def _validate_year(value, name):
    """Validate a 4-digit year string."""
    if value is None:
        return None, None
    try:
        y = int(value)
    except (ValueError, TypeError):
        return None, f"'{name}' must be a 4-digit year"
    if y < 1000 or y > 9999:
        return None, f"'{name}' must be a 4-digit year"
    return y, None


# ---------------------------------------------------------------------------
# GET /api/stats
# ---------------------------------------------------------------------------
@papers_bp.route("/stats", methods=["GET"])
def api_stats():
    try:
        data = get_stats()
        return jsonify({"success": True, "data": data})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


# ---------------------------------------------------------------------------
# GET /api/papers/filters   (must be before <int:paper_id> route)
# ---------------------------------------------------------------------------
@papers_bp.route("/papers/filters", methods=["GET"])
def api_filters():
    try:
        data = get_filter_options()
        return jsonify({"success": True, "data": data})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


# ---------------------------------------------------------------------------
# GET /api/papers
# ---------------------------------------------------------------------------
@papers_bp.route("/papers", methods=["GET"])
def api_search_papers():
    # Pagination
    page, err = _validate_int_param(request.args.get("page"), "page", min_val=1, default=1)
    if err:
        return jsonify({"success": False, "error": err}), 400

    limit, err = _validate_int_param(request.args.get("limit"), "limit", min_val=1, max_val=100, default=20)
    if err:
        return jsonify({"success": False, "error": err}), 400

    # Year filters
    year_from, err = _validate_year(request.args.get("year_from"), "year_from")
    if err:
        return jsonify({"success": False, "error": err}), 400

    year_to, err = _validate_year(request.args.get("year_to"), "year_to")
    if err:
        return jsonify({"success": False, "error": err}), 400

    q = request.args.get("q") or None
    author = request.args.get("author") or None
    source = request.args.get("source") or None
    paper_type = request.args.get("paper_type") or None
    journal = request.args.get("journal") or None
    sort = request.args.get("sort", "newest")

    if sort not in ("newest", "oldest", "most_cited"):
        return jsonify({"success": False, "error": "sort must be 'newest', 'oldest', or 'most_cited'"}), 400

    try:
        papers, total = search_papers(
            q=q, author=author, source=source,
            year_from=year_from, year_to=year_to,
            paper_type=paper_type, journal=journal,
            sort=sort, page=page, limit=limit
        )
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500

    import math
    total_pages = math.ceil(total / limit) if limit else 0

    return jsonify({
        "success": True,
        "data": papers,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages,
        }
    })


# ---------------------------------------------------------------------------
# GET /api/papers/<int:paper_id>
# ---------------------------------------------------------------------------
@papers_bp.route("/papers/<int:paper_id>", methods=["GET"])
def api_get_paper(paper_id):
    try:
        paper = get_paper_by_id(paper_id)
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500

    if paper is None:
        return jsonify({"success": False, "error": "Paper not found"}), 404

    return jsonify({"success": True, "data": paper})
