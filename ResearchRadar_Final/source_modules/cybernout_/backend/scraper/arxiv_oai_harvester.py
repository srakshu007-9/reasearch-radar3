
import json
import time
import logging
import xml.etree.ElementTree as ET

from pathlib import Path
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


# ==================================================
# 1. CONFIGURATION
# ==================================================

OAI_URL = "https://oaipmh.arxiv.org/oai"

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

OUTPUT_FILE = DATA_DIR / "arxiv_papers.jsonl"

TOKEN_FILE = DATA_DIR / "arxiv_resumption_token.txt"

MAX_RECORDS = 30000

REQUEST_DELAY = 3

TIMEOUT = 120


# ==================================================
# 2. LOGGING CONFIGURATION
# ==================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


# ==================================================
# 3. CREATE HTTP SESSION
# ==================================================

def create_session():

    session = requests.Session()

    retries = Retry(
        total=3,
        connect=3,
        read=3,
        status=3,
        backoff_factor=5,
        status_forcelist=[
            429, 500, 502, 503, 504
        ],
        allowed_methods=["GET"],
        respect_retry_after_header=True
    )

    adapter = HTTPAdapter(max_retries=retries)

    session.mount("https://", adapter)

    session.headers.update({
        "User-Agent": "ResearchHub/1.0 (academic metadata harvesting)"
    })

    return session


# ==================================================
# 4. XML HELPER FUNCTIONS
# ==================================================

def local_name(tag):

    return tag.split("}")[-1].split(":")[-1]


def find_text(element, name):

    for child in element.iter():

        if local_name(child.tag) == name:

            if child.text:
                return child.text.strip()

    return ""


def find_elements(element, name):

    return [
        child
        for child in element.iter()
        if local_name(child.tag) == name
    ]


# ==================================================
# 5. PARSE RESEARCH PAPER
# ==================================================

def parse_record(record):

    # Skip deleted records
    header = None

    for child in record:

        if local_name(child.tag) == "header":
            header = child
            break

    if header is None:
        return None

    if header.attrib.get("status") == "deleted":
        return None

    identifier = find_text(header, "identifier")

    paper_id = identifier.split(":")[-1]

    metadata = None

    for child in record:

        if local_name(child.tag) == "metadata":
            metadata = child
            break

    if metadata is None:
        return None

    title = find_text(metadata, "title")

    abstract = find_text(metadata, "abstract")

    # Extract authors
    authors = []

    for author in find_elements(metadata, "author"):

        keyname = find_text(author, "keyname")

        forenames = find_text(author, "forenames")

        name = " ".join(
            part for part in [forenames, keyname] if part
        )

        if name:
            authors.append(name)

    # Extract categories
    categories_text = find_text(metadata, "categories")

    categories = categories_text.split()

    # Extract metadata
    paper = {

        "source": "arXiv",

        "arxiv_id": paper_id,

        "title": " ".join(title.split()),

        "authors": authors,

        "abstract": " ".join(abstract.split()),

        "published": find_text(metadata, "created"),

        "updated": find_text(metadata, "updated"),

        "categories": categories,

        "doi": find_text(metadata, "doi"),

        "journal_ref": find_text(metadata, "journal-ref"),

        "paper_url": (
            f"https://arxiv.org/abs/{paper_id}"
            if paper_id else ""
        ),

        "pdf_url": (
            f"https://arxiv.org/pdf/{paper_id}"
            if paper_id else ""
        )

    }

    if not paper_id:
        return None

    return paper


# ==================================================
# 6. LOAD EXISTING UNIQUE PAPER IDS
# ==================================================

def load_existing_ids():

    existing_ids = set()

    if not OUTPUT_FILE.exists():
        return existing_ids

    logger.info("Checking existing JSONL records...")

    with open(
        OUTPUT_FILE,
        "r",
        encoding="utf-8"
    ) as file:

        for line in file:

            try:

                paper = json.loads(line)

                paper_id = paper.get("arxiv_id")

                if paper_id:
                    existing_ids.add(paper_id)

            except json.JSONDecodeError:

                logger.warning(
                    "Skipping an invalid JSONL line."
                )

    logger.info(
        f"Existing unique papers: {len(existing_ids)}"
    )

    return existing_ids


# ==================================================
# 7. SAVE PAPERS
# ==================================================

def save_records(records):

    if not records:
        return

    DATA_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(
        OUTPUT_FILE,
        "a",
        encoding="utf-8"
    ) as file:

        for paper in records:

            file.write(
                json.dumps(
                    paper,
                    ensure_ascii=False
                ) + "\n"
            )

        file.flush()


# ==================================================
# 8. CHECKPOINT MANAGEMENT
# ==================================================

def load_token():

    if TOKEN_FILE.exists():

        return TOKEN_FILE.read_text(
            encoding="utf-8"
        ).strip()

    return ""


def save_token(token):

    DATA_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    TOKEN_FILE.write_text(
        token or "",
        encoding="utf-8"
    )


# ==================================================
# 9. ARXIV OAI-PMH HARVESTER
# ==================================================

def harvest_arxiv():

    DATA_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    session = create_session()

    existing_ids = load_existing_ids()

    total = len(existing_ids)

    page = 0

    token = load_token()

    logger.info("=" * 55)

    logger.info("ResearchHub arXiv harvester started.")

    logger.info(f"Target: {MAX_RECORDS} unique papers")

    logger.info(f"Already collected: {total}")

    logger.info("=" * 55)

    # Stop if target is already reached
    if total >= MAX_RECORDS:

        logger.info(
            "Target already reached. No scraping required."
        )

        session.close()

        return

    try:

        while total < MAX_RECORDS:

            # Prepare request parameters

            if token:

                params = {
                    "verb": "ListRecords",
                    "resumptionToken": token
                }

            else:

                params = {
                    "verb": "ListRecords",
                    "metadataPrefix": "arXiv"
                }

            logger.info(
                f"Requesting batch {page + 1}..."
            )

            response = session.get(
                OAI_URL,
                params=params,
                timeout=TIMEOUT
            )

            response.raise_for_status()

            root = ET.fromstring(response.content)

            # Check API errors

            errors = find_elements(root, "error")

            if errors:

                messages = [
                    error.text
                    for error in errors
                    if error.text
                ]

                raise RuntimeError(
                    f"OAI-PMH error: {messages}"
                )

            # Extract records

            records = find_elements(root, "record")

            new_papers = []

            for record in records:

                if total + len(new_papers) >= MAX_RECORDS:
                    break

                paper = parse_record(record)

                if not paper:
                    continue

                paper_id = paper["arxiv_id"]

                # Duplicate detection

                if paper_id in existing_ids:
                    continue

                if paper_id in {
                    p["arxiv_id"] for p in new_papers
                }:
                    continue

                new_papers.append(paper)

            # Save current batch

            save_records(new_papers)

            # Update unique ID set

            for paper in new_papers:

                existing_ids.add(
                    paper["arxiv_id"]
                )

            total = len(existing_ids)

            page += 1

            logger.info(
                f"Batch {page} completed."
            )

            logger.info(
                f"New papers: {len(new_papers)}"
            )

            logger.info(
                f"Total unique papers: {total}/{MAX_RECORDS}"
            )

            # Extract continuation token

            tokens = find_elements(
                root,
                "resumptionToken"
            )

            next_token = ""

            if tokens and tokens[0].text:

                next_token = tokens[0].text.strip()

            # Save checkpoint AFTER saving records

            save_token(next_token)

            # Stop exactly at target

            if total >= MAX_RECORDS:

                logger.info("=" * 55)

                logger.info(
                    f"TARGET REACHED: {MAX_RECORDS} RECORDS"
                )

                logger.info(
                    "Stopping arXiv harvesting."
                )

                logger.info("=" * 55)

                break

            # Check if more records exist

            if not next_token:

                logger.info(
                    "No more records available."
                )

                break

            token = next_token

            # Respect API request intervals

            time.sleep(REQUEST_DELAY)

    except requests.RequestException as error:

        logger.error(
            f"Network/API error: {error}"
        )

        logger.info(
            "Checkpoint preserved. Retry later."
        )

    except Exception as error:

        logger.exception(
            f"Harvesting failed: {error}"
        )

        logger.info(
            "Check the checkpoint before restarting."
        )

    finally:

        session.close()

    logger.info("=" * 55)

    logger.info(
        f"FINAL UNIQUE RECORD COUNT: {total}"
    )

    logger.info("=" * 55)


# ==================================================
# 10. MAIN EXECUTION
# ==================================================

if __name__ == "__main__":

    harvest_arxiv()
