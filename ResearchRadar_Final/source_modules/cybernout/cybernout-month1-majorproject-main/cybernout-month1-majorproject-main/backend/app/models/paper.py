import json
from database.db_connection import get_connection


def _parse_json_field(value):
    """Parse a JSON string field into a Python list. Returns [] on failure."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    try:
        result = json.loads(value)
        return result if isinstance(result, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def _row_to_dict(row, cursor):
    """Convert a cursor row (tuple) to a dict using cursor.description."""
    columns = [col[0] for col in cursor.description]
    paper = dict(zip(columns, row))

    # Parse JSON fields
    paper["authors"] = _parse_json_field(paper.get("authors"))
    paper["keywords"] = _parse_json_field(paper.get("keywords"))
    paper["sources"] = _parse_json_field(paper.get("sources"))
    paper["openalex_ids"] = _parse_json_field(paper.get("openalex_ids"))

    # Convert date to string
    if paper.get("publication_date") is not None:
        paper["publication_date"] = str(paper["publication_date"])

    return paper


def search_papers(q=None, author=None, source=None, year_from=None,
                  year_to=None, paper_type=None, journal=None,
                  sort="newest", page=1, limit=20):
    """
    Search papers with optional filters.
    Returns (papers_list, total_count).
    """
    conn = get_connection()
    if conn is None:
        raise RuntimeError("Database connection failed")

    try:
        cursor = conn.cursor()

        conditions = []
        params = []

        if q:
            search_term = f"%{q}%"
            conditions.append("(title LIKE %s OR abstract LIKE %s)")
            params.extend([search_term, search_term])

        if author:
            author_term = f"%{author}%"
            conditions.append("authors LIKE %s")
            params.append(author_term)

        if source:
            conditions.append("JSON_CONTAINS(sources, JSON_QUOTE(%s))")
            params.append(source)

        if year_from:
            conditions.append("publication_year >= %s")
            params.append(int(year_from))

        if year_to:
            conditions.append("publication_year <= %s")
            params.append(int(year_to))

        if paper_type:
            conditions.append("paper_type = %s")
            params.append(paper_type)

        if journal:
            conditions.append("journal = %s")
            params.append(journal)

        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

        # Sort
        sort_map = {
            "newest": "ORDER BY publication_year DESC, id DESC",
            "oldest": "ORDER BY publication_year ASC, id ASC",
            "most_cited": "ORDER BY citation_count DESC",
        }
        order_clause = sort_map.get(sort, sort_map["newest"])

        # Count query
        count_sql = f"SELECT COUNT(*) FROM papers {where_clause}"
        cursor.execute(count_sql, params)
        total_count = cursor.fetchone()[0]

        # Data query
        offset = (page - 1) * limit
        data_sql = f"""
            SELECT id, canonical_id, title, abstract, doi,
                   authors, keywords, journal, publisher,
                   publication_date, publication_year, paper_type,
                   citation_count, sources, paper_url, pdf_url
            FROM papers
            {where_clause}
            {order_clause}
            LIMIT %s OFFSET %s
        """
        cursor.execute(data_sql, params + [limit, offset])
        rows = cursor.fetchall()
        papers = [_row_to_dict(row, cursor) for row in rows]

        return papers, total_count

    finally:
        cursor.close()
        conn.close()


def get_paper_by_id(paper_id):
    """Return a single paper dict or None."""
    conn = get_connection()
    if conn is None:
        raise RuntimeError("Database connection failed")

    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, canonical_id, title, abstract, doi, openalex_ids,
                   authors, keywords, journal, publisher,
                   publication_date, publication_year, paper_type,
                   citation_count, sources, paper_url, pdf_url
            FROM papers WHERE id = %s
            """,
            (paper_id,)
        )
        row = cursor.fetchone()
        if row is None:
            return None
        return _row_to_dict(row, cursor)
    finally:
        cursor.close()
        conn.close()


def get_filter_options():
    """Return available filter values: sources, year_range, paper_types."""
    conn = get_connection()
    if conn is None:
        raise RuntimeError("Database connection failed")

    try:
        cursor = conn.cursor()

        # Paper types
        cursor.execute(
            "SELECT DISTINCT paper_type FROM papers WHERE paper_type IS NOT NULL ORDER BY paper_type"
        )
        paper_types = [row[0] for row in cursor.fetchall() if row[0]]

        # Year range
        cursor.execute(
            "SELECT MIN(publication_year), MAX(publication_year) FROM papers WHERE publication_year IS NOT NULL"
        )
        year_row = cursor.fetchone()
        year_min = year_row[0] if year_row else None
        year_max = year_row[1] if year_row else None

        # Sources — extracted from JSON arrays using JSON_TABLE (MySQL 8+)
        try:
            cursor.execute(
                """
                SELECT DISTINCT src.value
                FROM papers,
                     JSON_TABLE(sources, '$[*]' COLUMNS (value VARCHAR(100) PATH '$')) AS src
                WHERE sources IS NOT NULL
                ORDER BY src.value
                """
            )
            sources = [row[0] for row in cursor.fetchall() if row[0]]
        except Exception:
            # Fallback: collect unique sources from a sample
            cursor.execute("SELECT DISTINCT sources FROM papers WHERE sources IS NOT NULL LIMIT 1000")
            source_set = set()
            for (raw,) in cursor.fetchall():
                try:
                    for s in json.loads(raw):
                        source_set.add(s)
                except Exception:
                    pass
            sources = sorted(source_set)

        return {
            "sources": sources,
            "year_range": {"min": year_min, "max": year_max},
            "paper_types": paper_types,
        }
    finally:
        cursor.close()
        conn.close()


def get_stats():
    """Return high-level statistics about the papers table."""
    conn = get_connection()
    if conn is None:
        raise RuntimeError("Database connection failed")

    try:
        cursor = conn.cursor()

        # Total papers
        cursor.execute("SELECT COUNT(*) FROM papers")
        total_papers = cursor.fetchone()[0]

        # Year range
        cursor.execute(
            "SELECT MIN(publication_year), MAX(publication_year) FROM papers WHERE publication_year IS NOT NULL"
        )
        year_row = cursor.fetchone()
        year_range = {"min": year_row[0], "max": year_row[1]} if year_row else {}

        # Sources breakdown via JSON_TABLE (MySQL 8+)
        sources_breakdown = {}
        try:
            cursor.execute(
                """
                SELECT src.value, COUNT(*) as cnt
                FROM papers,
                     JSON_TABLE(sources, '$[*]' COLUMNS (value VARCHAR(100) PATH '$')) AS src
                WHERE sources IS NOT NULL
                GROUP BY src.value
                ORDER BY cnt DESC
                """
            )
            for row in cursor.fetchall():
                sources_breakdown[row[0]] = row[1]
        except Exception:
            pass

        return {
            "total_papers": total_papers,
            "year_range": year_range,
            "sources": sources_breakdown,
        }
    finally:
        cursor.close()
        conn.close()
