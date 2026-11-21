
import json
import logging
import math
import hashlib
from pathlib import Path
from datetime import datetime, date

from database.db_connection import get_connection


# ============================================================
# RESEARCHHUB - MYSQL DATA IMPORTER
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

CANONICAL_FILE = DATA_DIR / "canonical_papers.jsonl"
SOURCES_FILE = DATA_DIR / "paper_sources.jsonl"
REJECTED_FILE = DATA_DIR / "import_rejected_records.jsonl"

BATCH_SIZE = 500

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger("ResearchHubImporter")


# ============================================================
# REJECTED RECORD LOGGING
# ============================================================

def log_rejected_record(label, record_number, record, error):
    """Save failed records and their errors for later inspection."""

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    rejected = {
        "record_type": label,
        "record_number": record_number,
        "error": str(error),
        "record": sanitize_unicode(record)
    }

    with open(
        REJECTED_FILE,
        "a",
        encoding="utf-8"
    ) as file:
        file.write(
            json.dumps(
                rejected,
                ensure_ascii=True,
                default=str
            ) + "\n"
        )


# ============================================================
# UNICODE AND JSON CLEANING
# ============================================================

def sanitize_unicode(value):
    """
    Recursively replace invalid Unicode characters.
    Also converts non-finite floating-point values to None.
    """

    if isinstance(value, str):
        return value.encode(
            "utf-8",
            errors="replace"
        ).decode("utf-8")

    if isinstance(value, dict):
        return {
            sanitize_unicode(str(key)): sanitize_unicode(item)
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [
            sanitize_unicode(item)
            for item in value
        ]

    if isinstance(value, tuple):
        return tuple(
            sanitize_unicode(item)
            for item in value
        )

    if isinstance(value, float):
        if not math.isfinite(value):
            return None

    return value


def safe_text(value):
    """Convert a value into safe MySQL-compatible text."""

    if value is None:
        return None

    value = sanitize_unicode(value)

    if isinstance(value, (dict, list, tuple)):
        value = json.dumps(
            value,
            ensure_ascii=True,
            default=str,
            allow_nan=False
        )

    return sanitize_unicode(str(value))


def json_value(value):
    """Return valid, ASCII-safe JSON for MySQL JSON columns."""

    if value is None:
        value = []

    value = sanitize_unicode(value)

    return json.dumps(
        value,
        ensure_ascii=True,
        default=str,
        allow_nan=False,
        separators=(",", ":")
    )


# ============================================================
# GENERAL HELPER FUNCTIONS
# ============================================================

def safe_date(value):

    if not value:
        return None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    if isinstance(value, dict):
        for key in ("date", "date-parts", "date_parts"):
            if key in value:
                value = value[key]
                break

    if isinstance(value, list):
        try:
            if value and isinstance(value[0], list):
                value = value[0]

            if value and isinstance(value[0], int):
                year = value[0]
                month = value[1] if len(value) > 1 else 1
                day = value[2] if len(value) > 2 else 1

                return date(year, month, day)

        except (ValueError, TypeError, IndexError):
            return None

    value = safe_text(value)

    if not value:
        return None

    try:
        return datetime.fromisoformat(
            value.replace("Z", "+00:00")
        ).date()

    except ValueError:
        pass

    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y-%m", "%Y"):
        try:
            return datetime.strptime(value, fmt).date()

        except ValueError:
            continue

    return None


def safe_int(value, default=0):

    try:
        if value is None:
            return default

        return int(value)

    except (ValueError, TypeError, OverflowError):
        return default


def first_value(values, fallback=None):

    if isinstance(values, list):
        return values[0] if values else fallback

    return values or fallback


# ============================================================
# READ JSONL FILE
# ============================================================

def read_jsonl(file_path):

    if not file_path.exists():
        raise FileNotFoundError(
            f"File not found: {file_path}"
        )

    with open(
        file_path,
        "r",
        encoding="utf-8-sig",
        errors="replace"
    ) as file:

        for line_number, line in enumerate(file, start=1):

            if not line.strip():
                continue

            try:
                record = json.loads(line)

                if isinstance(record, dict):
                    yield record

                else:
                    logger.warning(
                        "Non-object JSON at line %s in %s",
                        line_number,
                        file_path.name
                    )

            except (json.JSONDecodeError, ValueError) as error:
                logger.warning(
                    "Invalid JSON at line %s in %s: %s",
                    line_number,
                    file_path.name,
                    error
                )


# ============================================================
# BATCH INSERTION WITH INDIVIDUAL RETRY
# ============================================================

def execute_batches(
    cursor,
    connection,
    query,
    rows,
    label
):
    """
    Insert records in batches.

    If a batch fails, retry its rows individually.
    Failed individual records are written to a JSONL file.
    """

    total = len(rows)
    successful = 0
    failed = 0

    if total == 0:
        logger.warning("No records available for %s", label)
        return successful, failed

    for start in range(0, total, BATCH_SIZE):

        batch = rows[start:start + BATCH_SIZE]

        try:
            cursor.executemany(query, batch)
            connection.commit()

            successful += len(batch)

        except Exception as batch_error:

            connection.rollback()

            logger.warning(
                "%s batch %s-%s failed. Retrying individually. Error: %s",
                label,
                start + 1,
                min(start + BATCH_SIZE, total),
                batch_error
            )

            for offset, row in enumerate(batch):

                record_number = start + offset + 1

                try:
                    cursor.execute(query, row)
                    connection.commit()

                    successful += 1

                except Exception as row_error:

                    connection.rollback()
                    failed += 1

                    log_rejected_record(
                        label,
                        record_number,
                        {"prepared_row": row},
                        row_error
                    )

                    logger.error(
                        "%s record %s failed: %s",
                        label,
                        record_number,
                        row_error
                    )

        completed = min(start + BATCH_SIZE, total)

        logger.info(
            "%s progress: %s / %s | Successful: %s | Failed: %s",
            label,
            completed,
            total,
            successful,
            failed
        )

    logger.info(
        "%s finished. Successful: %s, Failed: %s",
        label,
        successful,
        failed
    )

    return successful, failed


# ============================================================
# PREPARE CANONICAL PAPER
# ============================================================

def prepare_canonical_paper(paper):

    canonical_id = safe_text(
        paper.get("canonical_id")
    )

    if not canonical_id:
        raise ValueError("Missing canonical_id")

    title = safe_text(
        paper.get("title")
    )

    if not title or not title.strip():
        raise ValueError("Missing paper title")

    doi_list = paper.get("dois") or []

    doi = safe_text(
        first_value(
            doi_list,
            paper.get("doi")
        )
    )

    publication_date = safe_date(
        paper.get("publication_date")
    )

    publication_year = safe_int(
        paper.get("publication_year"),
        None
    )

    if publication_year is None and publication_date:
        publication_year = publication_date.year

    return (
        canonical_id,
        title,
        safe_text(paper.get("abstract")),
        doi,
        json_value(paper.get("arxiv_ids")),
        json_value(paper.get("pmids")),
        json_value(paper.get("openalex_ids")),
        json_value(paper.get("authors")),
        json_value(paper.get("keywords")),
        safe_text(paper.get("journal")),
        safe_text(paper.get("publisher")),
        publication_date,
        publication_year,
        safe_text(paper.get("paper_type")),
        safe_int(paper.get("citation_count")),
        json_value(paper.get("sources")),
        safe_text(paper.get("paper_url")),
        safe_text(paper.get("pdf_url"))
    )


# ============================================================
# IMPORT CANONICAL PAPERS
# ============================================================

def import_canonical_papers(cursor, connection):

    logger.info("Reading canonical papers...")

    records = list(read_jsonl(CANONICAL_FILE))

    logger.info(
        "Canonical records found: %s",
        len(records)
    )

    rows = []

    for index, paper in enumerate(records, start=1):

        try:
            rows.append(
                prepare_canonical_paper(paper)
            )

        except Exception as error:

            log_rejected_record(
                "canonical_preparation",
                index,
                paper,
                error
            )

            logger.warning(
                "Skipping canonical record %s: %s",
                index,
                error
            )

    query = """
        INSERT INTO papers (
            canonical_id,
            title,
            abstract,
            doi,
            arxiv_ids,
            pmids,
            openalex_ids,
            authors,
            keywords,
            journal,
            publisher,
            publication_date,
            publication_year,
            paper_type,
            citation_count,
            sources,
            paper_url,
            pdf_url
        )
        VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        ON DUPLICATE KEY UPDATE
            canonical_id = VALUES(canonical_id)
    """

    result = execute_batches(
        cursor,
        connection,
        query,
        rows,
        "Canonical papers"
    )

    logger.info(
        "Canonical records prepared: %s",
        len(rows)
    )

    return result


# ============================================================
# GET MYSQL PAPER ID MAPPING
# ============================================================

def get_paper_id_mapping(cursor):

    logger.info("Building paper ID mapping...")

    cursor.execute("""
        SELECT id, canonical_id
        FROM papers
    """)

    mapping = {
        canonical_id: paper_id
        for paper_id, canonical_id in cursor.fetchall()
    }

    logger.info(
        "Paper ID mapping created: %s",
        len(mapping)
    )

    return mapping


# ============================================================
# PREPARE SOURCE RECORD
# ============================================================

def prepare_source_record(paper, paper_mapping):

    canonical_id = safe_text(
        paper.get("canonical_id")
    )

    paper_id = paper_mapping.get(canonical_id)

    if not paper_id:
        raise ValueError(
            f"Canonical paper not found: {canonical_id}"
        )

    source = safe_text(
        paper.get("source") or "unknown"
    ).strip().lower()

    source_metadata = paper.get("source_metadata") or {}

    if not isinstance(source_metadata, dict):
        source_metadata = {
            "original_metadata": source_metadata
        }

    source_metadata = sanitize_unicode(source_metadata)

    source_record_id = paper.get("source_record_id")

    if not source_record_id:

        source_record_id = (
            source_metadata.get("source_record_id")
            or source_metadata.get("crossref_id")
            or paper.get("doi")
            or paper.get("arxiv_id")
            or paper.get("pmid")
            or paper.get("openalex_id")
        )

    if not source_record_id:

        identity = json.dumps(
            sanitize_unicode(paper),
            sort_keys=True,
            ensure_ascii=True,
            default=str,
            allow_nan=False
        )

        source_record_id = hashlib.sha256(
            identity.encode("utf-8")
        ).hexdigest()

    source_record_id = safe_text(
        source_record_id
    )[:255]

    doi = safe_text(paper.get("doi"))
    arxiv_id = safe_text(paper.get("arxiv_id"))
    pmid = safe_text(paper.get("pmid"))

    openalex_id = safe_text(
        paper.get("openalex_id")
    )

    crossref_id = safe_text(
        source_metadata.get("crossref_id")
        or (
            paper.get("source_record_id")
            if source == "crossref"
            else None
        )
    )

    return (
        paper_id,
        source,
        source_record_id,
        doi,
        arxiv_id,
        pmid,
        openalex_id,
        crossref_id,
        safe_text(paper.get("paper_url")),
        safe_text(paper.get("pdf_url")),
        json_value(source_metadata)
    )


# ============================================================
# IMPORT SOURCE RECORDS
# ============================================================

def import_source_records(cursor, connection):

    logger.info("Reading original source records...")

    paper_mapping = get_paper_id_mapping(cursor)

    records = list(read_jsonl(SOURCES_FILE))

    logger.info(
        "Source records found: %s",
        len(records)
    )

    rows = []

    for index, paper in enumerate(records, start=1):

        try:
            rows.append(
                prepare_source_record(
                    paper,
                    paper_mapping
                )
            )

        except Exception as error:

            log_rejected_record(
                "source_preparation",
                index,
                paper,
                error
            )

            logger.warning(
                "Skipping source record %s: %s",
                index,
                error
            )

    query = """
        INSERT INTO paper_sources (
            paper_id,
            source,
            source_record_id,
            doi,
            arxiv_id,
            pmid,
            openalex_id,
            crossref_id,
            source_url,
            pdf_url,
            source_metadata
        )
        VALUES (
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s
        )
        ON DUPLICATE KEY UPDATE
            paper_id = VALUES(paper_id)
    """

    result = execute_batches(
        cursor,
        connection,
        query,
        rows,
        "Source records"
    )

    logger.info(
        "Source records prepared: %s",
        len(rows)
    )

    return result


# ============================================================
# DATABASE REPORT
# ============================================================

def print_database_report(cursor):

    cursor.execute("SELECT COUNT(*) FROM papers")
    paper_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM paper_sources")
    source_count = cursor.fetchone()[0]

    cursor.execute("""
        SELECT source, COUNT(*)
        FROM paper_sources
        GROUP BY source
        ORDER BY source
    """)

    source_breakdown = cursor.fetchall()

    print("\n")
    print("=" * 60)
    print("       RESEARCHHUB MYSQL IMPORT REPORT")
    print("=" * 60)

    print(
        f"Unique papers in database : {paper_count}"
    )

    print(
        f"Source records in database: {source_count}"
    )

    print("\nSource-wise records:")

    for source, count in source_breakdown:
        print(f"{source:15} : {count}")

    print("=" * 60)


# ============================================================
# MAIN
# ============================================================

def main():

    print("\n")
    print("=" * 60)
    print("       RESEARCHHUB MYSQL DATA IMPORT")
    print("=" * 60)

    if not CANONICAL_FILE.exists():
        raise FileNotFoundError(
            "canonical_papers.jsonl not found. "
            "Run deduplication first."
        )

    if not SOURCES_FILE.exists():
        raise FileNotFoundError(
            "paper_sources.jsonl not found. "
            "Run deduplication first."
        )

    connection = get_connection()

    if not connection:
        logger.error("Could not connect to MySQL.")
        return

    cursor = None

    try:

        cursor = connection.cursor()

        logger.info(
            "Connected to ResearchHub database."
        )

        # Step 1: Import canonical papers.
        canonical_result = import_canonical_papers(
            cursor,
            connection
        )

        # Step 2: Import source records.
        source_result = import_source_records(
            cursor,
            connection
        )

        # Step 3: Print report.
        print_database_report(cursor)

        logger.info(
            "Canonical import successful: %s, failed: %s",
            *canonical_result
        )

        logger.info(
            "Source import successful: %s, failed: %s",
            *source_result
        )

        if canonical_result[1] == 0 and source_result[1] == 0:
            logger.info(
                "DATA IMPORT COMPLETED SUCCESSFULLY."
            )
        else:
            logger.warning(
                "IMPORT COMPLETED WITH REJECTED RECORDS. "
                "Check %s",
                REJECTED_FILE
            )

    except Exception as error:

        connection.rollback()

        logger.exception(
            "Database import failed: %s",
            error
        )

    finally:

        if cursor:
            cursor.close()

        connection.close()

        logger.info(
            "Database connection closed."
        )


if __name__ == "__main__":
    main()
