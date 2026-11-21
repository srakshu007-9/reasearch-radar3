
from database.db_connection import get_connection


def insert_paper(paper):
    """Insert one paper. Returns True if inserted, False otherwise."""
    connection = get_connection()

    if connection is None:
        return False

    cursor = connection.cursor()

    query = """
        INSERT INTO papers (
            title, abstract, doi, arxiv_id, pmid, openalex_id,
            authors, journal, publisher, publication_date,
            publication_year, paper_type, keywords, source,
            paper_url, pdf_url, citation_count
        )
        VALUES (
            %(title)s, %(abstract)s, %(doi)s, %(arxiv_id)s,
            %(pmid)s, %(openalex_id)s, %(authors)s, %(journal)s,
            %(publisher)s, %(publication_date)s, %(publication_year)s,
            %(paper_type)s, %(keywords)s, %(source)s,
            %(paper_url)s, %(pdf_url)s, %(citation_count)s
        )
        ON DUPLICATE KEY UPDATE
            title = COALESCE(NULLIF(VALUES(title), ''), title),
            abstract = COALESCE(NULLIF(VALUES(abstract), ''), abstract)
    """

    try:
        cursor.execute(query, paper)
        connection.commit()
        return True

    except Exception as error:
        connection.rollback()
        print(f"Insert error: {error}")
        return False

    finally:
        cursor.close()
        connection.close()


def get_paper_count():
    """Return the total number of stored papers."""
    connection = get_connection()

    if connection is None:
        return 0

    cursor = connection.cursor()

    try:
        cursor.execute("SELECT COUNT(*) FROM papers")
        return cursor.fetchone()[0]

    finally:
        cursor.close()
        connection.close()


def get_all_papers(limit=100):
    """Retrieve the latest papers."""
    connection = get_connection()

    if connection is None:
        return []

    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT * FROM papers ORDER BY id DESC LIMIT %s",
            (int(limit),)
        )
        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()
