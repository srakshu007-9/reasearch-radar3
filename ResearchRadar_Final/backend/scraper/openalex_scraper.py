
import os
import json
import time
import logging
import requests

from pathlib import Path
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

API_URL = os.getenv(
    "OPENALEX_API_URL",
    "https://api.openalex.org/works"
)

API_KEY = os.getenv("OPENALEX_API_KEY", "").strip()

MAX_RECORDS = int(
    os.getenv("OPENALEX_MAX_RECORDS", "30000")
)

PER_PAGE = min(
    int(os.getenv("OPENALEX_PER_PAGE", "100")),
    100
)

DATA_DIR = BASE_DIR / "data"

OUTPUT_FILE = DATA_DIR / "openalex_papers.jsonl"

CHECKPOINT_FILE = DATA_DIR / "openalex_cursor.txt"


# --------------------------------------------------
# LOGGING
# --------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger("OpenAlexScraper")


# --------------------------------------------------
# HTTP SESSION WITH RETRIES
# --------------------------------------------------

def create_session():

    session = requests.Session()

    retry_strategy = Retry(
        total=5,
        connect=5,
        read=5,
        status=5,
        backoff_factor=2,
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
        max_retries=retry_strategy
    )

    session.mount("https://", adapter)

    session.headers.update({
        "User-Agent": "ResearchHub/1.0 (Academic Research Project)"
    })

    return session


# --------------------------------------------------
# ABSTRACT CONVERSION
# --------------------------------------------------

def reconstruct_abstract(inverted_index):

    if not inverted_index:
        return None

    words = []

    for word, positions in inverted_index.items():

        for position in positions:

            words.append((position, word))

    words.sort(key=lambda item: item[0])

    return " ".join(
        word for position, word in words
    )


# --------------------------------------------------
# LOAD EXISTING RECORD IDS
# --------------------------------------------------

def load_existing_ids():

    existing_ids = set()

    if not OUTPUT_FILE.exists():
        return existing_ids

    logger.info("Checking existing OpenAlex records...")

    with OUTPUT_FILE.open(
        "r",
        encoding="utf-8"
    ) as file:

        for line in file:

            try:

                record = json.loads(line)

                record_id = record.get("openalex_id")

                if record_id:
                    existing_ids.add(record_id)

            except json.JSONDecodeError:

                logger.warning(
                    "Skipping invalid JSON line."
                )

    return existing_ids


# --------------------------------------------------
# CHECKPOINT MANAGEMENT
# --------------------------------------------------

def load_cursor():

    if CHECKPOINT_FILE.exists():

        cursor = CHECKPOINT_FILE.read_text(
            encoding="utf-8"
        ).strip()

        if cursor:
            logger.info("Resuming from saved cursor.")
            return cursor

    logger.info("Starting a new OpenAlex collection.")

    return "*"


def save_cursor(cursor):

    CHECKPOINT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    CHECKPOINT_FILE.write_text(
        cursor or "",
        encoding="utf-8"
    )


# --------------------------------------------------
# CLEAN AUTHORS
# --------------------------------------------------

def clean_authors(authorships):

    authors = []

    for authorship in authorships or []:

        author = authorship.get("author") or {}

        institutions = []

        for institution in authorship.get(
            "institutions", []
        ):

            institutions.append({
                "id": institution.get("id"),
                "name": institution.get("display_name")
            })

        authors.append({
            "author_id": author.get("id"),
            "name": author.get("display_name"),
            "orcid": author.get("orcid"),
            "institutions": institutions
        })

    return authors


# --------------------------------------------------
# CLEAN TOPICS
# --------------------------------------------------

def clean_topics(topics):

    result = []

    for topic in topics or []:

        result.append({
            "id": topic.get("id"),
            "name": topic.get("display_name"),
            "score": topic.get("score")
        })

    return result


# --------------------------------------------------
# CLEAN PAPER RECORD
# --------------------------------------------------

def clean_record(item):

    primary_location = (
        item.get("primary_location") or {}
    )

    source = primary_location.get("source") or {}

    best_oa_location = (
        item.get("best_oa_location") or {}
    )

    primary_topic = item.get("primary_topic") or {}

    open_access = item.get("open_access") or {}

    abstract = reconstruct_abstract(
        item.get("abstract_inverted_index")
    )

    return {

        "openalex_id": item.get("id"),

        "doi": item.get("doi"),

        "title": item.get("title"),

        "publication_year": item.get(
            "publication_year"
        ),

        "publication_date": item.get(
            "publication_date"
        ),

        "type": item.get("type"),

        "abstract": abstract,

        "authors": clean_authors(
            item.get("authorships")
        ),

        "topics": clean_topics(
            item.get("topics")
        ),

        "primary_topic": primary_topic.get(
            "display_name"
        ),

        "journal": source.get("display_name"),

        "publisher": source.get(
            "host_organization_name"
        ),

        "open_access": open_access.get("is_oa"),

        "landing_page_url": (
            primary_location.get("landing_page_url")
        ),

        "pdf_url": (
            best_oa_location.get("pdf_url")
            or primary_location.get("pdf_url")
        ),

        "cited_by_count": item.get(
            "cited_by_count"
        ),

        "referenced_works": item.get(
            "referenced_works"
        ),

        "source": "OpenAlex"

    }


# --------------------------------------------------
# SAVE RECORDS
# --------------------------------------------------

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


# --------------------------------------------------
# MAIN SCRAPER
# --------------------------------------------------

def scrape_openalex():

    logger.info("=" * 55)
    logger.info("RESEARCHHUB OPENALEX SCRAPER STARTED")
    logger.info("=" * 55)

    if not API_KEY:

        raise ValueError(
            "OpenAlex API key is missing. "
            "Add OPENALEX_API_KEY to your .env file."
        )

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
            "Target of %s records already reached.",
            MAX_RECORDS
        )

        return

    session = create_session()

    cursor = load_cursor()

    try:

        while total < MAX_RECORDS:

            params = {

                "api_key": API_KEY,

                "per_page": PER_PAGE,

                "cursor": cursor,

                "select": (
                    "id,doi,title,publication_year,"
                    "publication_date,type,"
                    "abstract_inverted_index,"
                    "authorships,topics,primary_topic,"
                    "primary_location,best_oa_location,"
                    "open_access,cited_by_count,"
                    "referenced_works"
                )

            }

            logger.info(
                "Fetching OpenAlex records: %s/%s",
                total,
                MAX_RECORDS
            )

            response = session.get(
                API_URL,
                params=params,
                timeout=90
            )

            if response.status_code != 200:

                logger.error(
                    "OpenAlex API response: %s",
                    response.text[:2000]
                )

            response.raise_for_status()

            data = response.json()

            results = data.get("results", [])

            if not results:

                logger.info(
                    "No more records available."
                )

                save_cursor("")
                break

            new_records = []

            for item in results:

                record = clean_record(item)

                record_id = record.get("openalex_id")

                if not record_id:
                    continue

                if record_id in existing_ids:
                    continue

                existing_ids.add(record_id)

                new_records.append(record)

                if total + len(new_records) >= MAX_RECORDS:
                    break

            # Save records before updating checkpoint.
            if new_records:

                save_records(new_records)

                total += len(new_records)

                logger.info(
                    "Saved %s new records. Total: %s/%s",
                    len(new_records),
                    total,
                    MAX_RECORDS
                )

            # Stop exactly at the configured target.
            if total >= MAX_RECORDS:

                logger.info(
                    "Target of %s records reached.",
                    MAX_RECORDS
                )

                break

            # Obtain next cursor.
            meta = data.get("meta") or {}

            next_cursor = meta.get("next_cursor")

            if not next_cursor:

                logger.info(
                    "OpenAlex pagination completed."
                )

                save_cursor("")
                break

            # Save checkpoint for future resumption.
            cursor = next_cursor

            save_cursor(cursor)

            # Respect API request limits.
            time.sleep(1)

    except requests.exceptions.HTTPError as error:

        logger.error(
            "HTTP error while collecting OpenAlex records: %s",
            error
        )

    except requests.exceptions.RequestException as error:

        logger.error(
            "Network error: %s",
            error
        )

    except json.JSONDecodeError as error:

        logger.error(
            "Invalid JSON response: %s",
            error
        )

    except Exception:

        logger.exception(
            "Unexpected error in OpenAlex scraper."
        )

    finally:

        session.close()

        logger.info("=" * 55)
        logger.info(
            "OPENALEX SCRAPER FINISHED: %s/%s",
            total,
            MAX_RECORDS
        )
        logger.info("=" * 55)


# --------------------------------------------------
# EXECUTION
# --------------------------------------------------

if __name__ == "__main__":

    scrape_openalex()
