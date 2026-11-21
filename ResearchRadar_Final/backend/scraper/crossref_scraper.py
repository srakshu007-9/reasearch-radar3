
import os
import re
import json
import time
import logging
import requests

from pathlib import Path
from html import unescape
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


# =====================================================
# 1. CONFIGURATION
# =====================================================

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

API_URL = os.getenv(
    "CROSSREF_API_URL",
    "https://api.crossref.org/works"
)

MAILTO = os.getenv("CROSSREF_MAILTO", "").strip()

MAX_RECORDS = int(
    os.getenv("CROSSREF_MAX_RECORDS", "30000")
)

PER_PAGE = min(
    int(os.getenv("CROSSREF_PER_PAGE", "1000")),
    1000
)

DATA_DIR = BASE_DIR / "data"

OUTPUT_FILE = DATA_DIR / "crossref_papers.jsonl"

CHECKPOINT_FILE = DATA_DIR / "crossref_cursor.txt"


# =====================================================
# 2. LOGGING
# =====================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger("CrossrefScraper")


# =====================================================
# 3. HTTP SESSION
# =====================================================

def create_session():

    session = requests.Session()

    retry = Retry(
        total=5,
        connect=5,
        read=5,
        status=5,
        backoff_factor=3,
        status_forcelist=[
            429,
            500,
            502,
            503,
            504
        ],
        allowed_methods=["GET"],
        respect_retry_after_header=True
    )

    adapter = HTTPAdapter(
        max_retries=retry
    )

    session.mount("https://", adapter)

    user_agent = "ResearchHub/1.0"

    if MAILTO:
        user_agent += f" (mailto:{MAILTO})"

    session.headers.update({
        "User-Agent": user_agent
    })

    return session


# =====================================================
# 4. TEXT CLEANING
# =====================================================

def clean_text(value):

    if not value:
        return None

    if isinstance(value, list):
        value = " ".join(str(x) for x in value)

    value = unescape(str(value))

    value = re.sub(
        r"<[^>]+>",
        " ",
        value
    )

    value = re.sub(
        r"\s+",
        " ",
        value
    )

    return value.strip() or None


# =====================================================
# 5. DATE EXTRACTION
# =====================================================

def extract_date(data):

    if not data:
        return None

    date_parts = data.get("date-parts")

    if not date_parts or not date_parts[0]:
        return None

    parts = date_parts[0]

    return {
        "year": parts[0],
        "month": parts[1] if len(parts) > 1 else None,
        "day": parts[2] if len(parts) > 2 else None
    }


# =====================================================
# 6. AUTHOR CLEANING
# =====================================================

def clean_authors(authors):

    result = []

    for author in authors or []:

        given = author.get("given")
        family = author.get("family")

        full_name = " ".join(
            value for value in [given, family]
            if value
        )

        affiliations = [
            affiliation.get("name")
            for affiliation in author.get(
                "affiliation", []
            )
            if affiliation.get("name")
        ]

        result.append({

            "given": given,

            "family": family,

            "full_name": full_name or None,

            "orcid": author.get("ORCID"),

            "affiliation": affiliations

        })

    return result


# =====================================================
# 7. CLEAN CROSSREF RECORD
# =====================================================

def clean_record(item):

    doi = item.get("DOI")

    if not doi:
        return None

    doi = doi.strip().lower()

    published_data = (
        item.get("published")
        or item.get("published-print")
        or item.get("published-online")
        or item.get("issued")
    )

    published = extract_date(published_data)

    authors = clean_authors(
        item.get("author")
    )

    subjects = item.get("subject") or []

    links = item.get("link") or []

    pdf_url = None

    for link in links:

        content_type = link.get(
            "content-type", ""
        )

        if "pdf" in content_type.lower():

            pdf_url = link.get("URL")

            break

    created = item.get("created") or {}

    deposited = item.get("deposited") or {}

    return {

        "crossref_id": doi,

        "doi": doi,

        "title": clean_text(
            item.get("title")
        ),

        "abstract": clean_text(
            item.get("abstract")
        ),

        "authors": authors,

        "publication_year": (
            published.get("year")
            if published else None
        ),

        "publication_date": published,

        "type": item.get("type"),

        "journal": clean_text(
            item.get("container-title")
        ),

        "publisher": item.get("publisher"),

        "volume": item.get("volume"),

        "issue": item.get("issue"),

        "page": item.get("page"),

        "issn": item.get("ISSN"),

        "isbn": item.get("ISBN"),

        "subjects": subjects,

        "reference_count": item.get(
            "references-count"
        ),

        "cited_by_count": item.get(
            "is-referenced-by-count"
        ),

        "url": item.get("URL"),

        "pdf_url": pdf_url,

        "created": created.get("date-time"),

        "updated": deposited.get("date-time"),

        "source": "Crossref"

    }


# =====================================================
# 8. LOAD EXISTING RECORD IDS
# =====================================================

def load_existing_ids():

    existing_ids = set()

    if not OUTPUT_FILE.exists():
        return existing_ids

    logger.info(
        "Loading existing Crossref records..."
    )

    with OUTPUT_FILE.open(
        "r",
        encoding="utf-8"
    ) as file:

        for line in file:

            try:

                record = json.loads(line)

                doi = record.get("crossref_id")

                if doi:
                    existing_ids.add(doi)

            except json.JSONDecodeError:

                logger.warning(
                    "Skipping malformed JSON record."
                )

    return existing_ids


# =====================================================
# 9. CHECKPOINT MANAGEMENT
# =====================================================

def load_cursor():

    if CHECKPOINT_FILE.exists():

        cursor = CHECKPOINT_FILE.read_text(
            encoding="utf-8"
        ).strip()

        if cursor:

            logger.info(
                "Resuming from saved Crossref cursor."
            )

            return cursor

    logger.info(
        "Starting new Crossref collection."
    )

    return "*"


def save_cursor(cursor):

    DATA_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    CHECKPOINT_FILE.write_text(
        cursor or "",
        encoding="utf-8"
    )


# =====================================================
# 10. SAVE RECORDS
# =====================================================

def save_records(records):

    DATA_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    with OUTPUT_FILE.open(
        "a",
        encoding="utf-8"
    ) as file:

        for record in records:

            file.write(
                json.dumps(
                    record,
                    ensure_ascii=False
                ) + "\n"
            )


# =====================================================
# 11. MAIN SCRAPER
# =====================================================

def scrape_crossref():

    logger.info("=" * 60)

    logger.info(
        "RESEARCHHUB CROSSREF SCRAPER STARTED"
    )

    logger.info("=" * 60)

    if MAX_RECORDS <= 0 or PER_PAGE <= 0:

        raise ValueError(
            "MAX_RECORDS and PER_PAGE must be positive."
        )

    existing_ids = load_existing_ids()

    total = len(existing_ids)

    logger.info(
        "Existing unique records: %s",
        total
    )

    if total >= MAX_RECORDS:

        logger.info(
            "Target already reached: %s",
            MAX_RECORDS
        )

        return

    session = create_session()

    cursor = load_cursor()

    try:

        while total < MAX_RECORDS:

            params = {

                "rows": PER_PAGE,

                "cursor": cursor,

                "select": (
                    "DOI,title,abstract,author,"
                    "published,published-print,"
                    "published-online,issued,type,"
                    "container-title,publisher,"
                    "volume,issue,page,ISSN,ISBN,"
                    "subject,references-count,"
                    "is-referenced-by-count,URL,"
                    "link,created,deposited"
                )

            }

            if MAILTO:

                params["mailto"] = MAILTO

            logger.info(
                "Fetching Crossref records: %s/%s",
                total,
                MAX_RECORDS
            )

            response = session.get(
                API_URL,
                params=params,
                timeout=120
            )

            if response.status_code != 200:

                logger.error(
                    "Crossref API response: %s",
                    response.text[:3000]
                )

            response.raise_for_status()

            data = response.json()

            message = data.get("message", {})

            items = message.get("items", [])

            if not items:

                logger.info(
                    "No more records available."
                )

                save_cursor("")
                break

            new_records = []

            for item in items:

                record = clean_record(item)

                if not record:
                    continue

                doi = record["crossref_id"]

                if doi in existing_ids:
                    continue

                existing_ids.add(doi)

                new_records.append(record)

                if total + len(new_records) >= MAX_RECORDS:
                    break

            if new_records:

                save_records(new_records)

                total += len(new_records)

                logger.info(
                    "Saved %s records. Total: %s/%s",
                    len(new_records),
                    total,
                    MAX_RECORDS
                )

            if total >= MAX_RECORDS:

                logger.info(
                    "Crossref target reached."
                )

                break

            next_cursor = message.get("next-cursor")

            if not next_cursor:

                logger.info(
                    "No next cursor available."
                )

                save_cursor("")
                break

            cursor = next_cursor

            save_cursor(cursor)

            # Respect Crossref API resources.
            time.sleep(1)

    except requests.exceptions.HTTPError as error:

        logger.error(
            "Crossref HTTP error: %s",
            error
        )

    except requests.exceptions.RequestException as error:

        logger.error(
            "Crossref connection error: %s",
            error
        )

    except json.JSONDecodeError as error:

        logger.error(
            "Invalid JSON response: %s",
            error
        )

    except Exception:

        logger.exception(
            "Unexpected Crossref scraper error."
        )

    finally:

        session.close()

        logger.info("=" * 60)

        logger.info(
            "CROSSREF SCRAPER FINISHED: %s/%s",
            total,
            MAX_RECORDS
        )

        logger.info("=" * 60)


# =====================================================
# 12. EXECUTION
# =====================================================

if __name__ == "__main__":

    scrape_crossref()
