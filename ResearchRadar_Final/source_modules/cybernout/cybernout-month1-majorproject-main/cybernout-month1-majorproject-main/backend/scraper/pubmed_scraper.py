
import os
import json
import time
import logging
import requests
import xml.etree.ElementTree as ET

from pathlib import Path
from datetime import date, timedelta
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


# =====================================================
# 1. CONFIGURATION
# =====================================================

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

API_BASE = os.getenv(
    "PUBMED_API_URL",
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
).rstrip("/")

API_KEY = os.getenv("PUBMED_API_KEY", "").strip()

EMAIL = os.getenv("PUBMED_EMAIL", "").strip()

MAX_RECORDS = int(
    os.getenv("PUBMED_MAX_RECORDS", "30000")
)

BATCH_SIZE = min(
    int(os.getenv("PUBMED_BATCH_SIZE", "200")),
    500
)

DATA_DIR = BASE_DIR / "data"

OUTPUT_FILE = DATA_DIR / "pubmed_papers.jsonl"

CHECKPOINT_FILE = DATA_DIR / "pubmed_checkpoint.json"

ESearch_URL = f"{API_BASE}/esearch.fcgi"

EFetch_URL = f"{API_BASE}/efetch.fcgi"


# =====================================================
# 2. LOGGING
# =====================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger("PubMedScraper")


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
        backoff_factor=2,
        status_forcelist=[
            429,
            500,
            502,
            503,
            504
        ],
        allowed_methods=["GET", "POST"],
        respect_retry_after_header=True
    )

    adapter = HTTPAdapter(
        max_retries=retry
    )

    session.mount("https://", adapter)

    session.headers.update({
        "User-Agent": "ResearchHub/1.0"
    })

    return session


# =====================================================
# 4. COMMON API PARAMETERS
# =====================================================

def common_params():

    params = {}

    if EMAIL:
        params["email"] = EMAIL

    if API_KEY:
        params["api_key"] = API_KEY

    return params


# =====================================================
# 5. LOAD EXISTING PMIDS
# =====================================================

def load_existing_ids():

    existing_ids = set()

    if not OUTPUT_FILE.exists():
        return existing_ids

    logger.info("Loading existing PubMed records...")

    with OUTPUT_FILE.open(
        "r",
        encoding="utf-8"
    ) as file:

        for line in file:

            try:

                record = json.loads(line)

                pmid = record.get("pmid")

                if pmid:
                    existing_ids.add(str(pmid))

            except json.JSONDecodeError:

                logger.warning(
                    "Skipping invalid JSON record."
                )

    return existing_ids


# =====================================================
# 6. CHECKPOINT MANAGEMENT
# =====================================================

def load_checkpoint():

    if not CHECKPOINT_FILE.exists():
        return {}

    try:

        with CHECKPOINT_FILE.open(
            "r",
            encoding="utf-8"
        ) as file:

            return json.load(file)

    except (json.JSONDecodeError, OSError):

        logger.warning(
            "Invalid checkpoint. Starting a new collection."
        )

        return {}


def save_checkpoint(data):

    DATA_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    temp_file = CHECKPOINT_FILE.with_suffix(".tmp")

    with temp_file.open(
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(data, file, indent=4)

    os.replace(temp_file, CHECKPOINT_FILE)


# =====================================================
# 7. XML TEXT EXTRACTION
# =====================================================

def get_text(element):

    if element is None:
        return None

    value = "".join(element.itertext()).strip()

    return value or None


def get_first_text(element, path):

    found = element.find(path)

    return get_text(found)


# =====================================================
# 8. AUTHOR EXTRACTION
# =====================================================

def extract_authors(article):

    authors = []

    author_list = article.find(
        ".//AuthorList"
    )

    if author_list is None:
        return authors

    for author in author_list.findall("Author"):

        collective = get_first_text(
            author,
            "CollectiveName"
        )

        given = get_first_text(
            author,
            "ForeName"
        )

        family = get_first_text(
            author,
            "LastName"
        )

        initials = get_first_text(
            author,
            "Initials"
        )

        affiliations = []

        for affiliation in author.findall(
            ".//Affiliation"
        ):

            value = get_text(affiliation)

            if value:
                affiliations.append(value)

        authors.append({

            "given": given,

            "family": family,

            "initials": initials,

            "collective_name": collective,

            "full_name": (
                collective
                or " ".join(
                    x for x in [given, family]
                    if x
                )
                or None
            ),

            "affiliations": affiliations

        })

    return authors


# =====================================================
# 9. ABSTRACT EXTRACTION
# =====================================================

def extract_abstract(article):

    abstract_element = article.find(
        ".//Abstract"
    )

    if abstract_element is None:
        return None

    sections = []

    for item in abstract_element.findall(
        "AbstractText"
    ):

        text = get_text(item)

        if not text:
            continue

        label = (
            item.get("Label")
            or item.get("NlmCategory")
        )

        if label:
            sections.append(
                f"{label}: {text}"
            )
        else:
            sections.append(text)

    return "\n".join(sections) or None


# =====================================================
# 10. PUBLICATION DATE
# =====================================================

def extract_publication_date(article):

    pub_date = article.find(
        ".//JournalIssue/PubDate"
    )

    if pub_date is None:
        pub_date = article.find(
            ".//PubDate"
        )

    if pub_date is None:
        return None

    return {

        "year": get_first_text(
            pub_date,
            "Year"
        ),

        "month": get_first_text(
            pub_date,
            "Month"
        ),

        "day": get_first_text(
            pub_date,
            "Day"
        ),

        "medline_date": get_first_text(
            pub_date,
            "MedlineDate"
        )

    }


# =====================================================
# 11. DOI AND OTHER IDENTIFIERS
# =====================================================

def extract_identifiers(article):

    identifiers = {}

    for item in article.findall(
        ".//ArticleId"
    ):

        id_type = item.get("IdType")

        value = get_text(item)

        if id_type and value:

            identifiers[id_type.lower()] = value

    return identifiers


# =====================================================
# 12. KEYWORDS
# =====================================================

def extract_keywords(article):

    keywords = []

    for item in article.findall(
        ".//Keyword"
    ):

        value = get_text(item)

        if value:
            keywords.append(value)

    return keywords


# =====================================================
# 13. MESH TERMS
# =====================================================

def extract_mesh(article):

    mesh_terms = []

    for item in article.findall(
        ".//MeshHeading"
    ):

        descriptor = get_first_text(
            item,
            "DescriptorName"
        )

        qualifiers = [
            get_text(q)
            for q in item.findall("QualifierName")
            if get_text(q)
        ]

        if descriptor:

            mesh_terms.append({

                "descriptor": descriptor,

                "qualifiers": qualifiers

            })

    return mesh_terms


# =====================================================
# 14. PUBLICATION TYPES
# =====================================================

def extract_publication_types(article):

    result = []

    for item in article.findall(
        ".//PublicationType"
    ):

        value = get_text(item)

        if value:
            result.append(value)

    return result


# =====================================================
# 15. CLEAN PUBMED RECORD
# =====================================================

def clean_record(pubmed_article):

    citation = pubmed_article.find(
        "MedlineCitation"
    )

    if citation is None:
        return None

    article = citation.find("Article")

    if article is None:
        return None

    pmid = get_first_text(
        citation,
        "PMID"
    )

    if not pmid:
        return None

    journal = article.find("Journal")

    journal_title = None
    issn = None

    if journal is not None:

        journal_title = get_first_text(
            journal,
            "Title"
        )

        issn = get_first_text(
            journal,
            "ISSN"
        )

    identifiers = extract_identifiers(
        pubmed_article
    )

    return {

        "pmid": str(pmid),

        "doi": identifiers.get("doi"),

        "pmc_id": identifiers.get("pmc"),

        "title": get_first_text(
            article,
            "ArticleTitle"
        ),

        "abstract": extract_abstract(
            article
        ),

        "authors": extract_authors(
            article
        ),

        "journal": journal_title,

        "issn": issn,

        "publication_date": extract_publication_date(
            article
        ),

        "publication_types": extract_publication_types(
            article
        ),

        "keywords": extract_keywords(
            pubmed_article
        ),

        "mesh_terms": extract_mesh(
            pubmed_article
        ),

        "language": [
            get_text(item)
            for item in article.findall("Language")
            if get_text(item)
        ],

        "source": "PubMed",

        "url": (
            f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
        )

    }


# =====================================================
# 16. SAVE RECORDS
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
# 17. SEARCH ONE DATE USING ESEARCH
# =====================================================

def search_pubmed_date(session, search_date):

    term = f'"{search_date}"[EDAT]'

    params = {

        "db": "pubmed",

        "term": term,

        "usehistory": "y",

        "retmode": "json",

        "retmax": 0,

        "sort": "pub date"

    }

    params.update(common_params())

    response = session.get(
        ESearch_URL,
        params=params,
        timeout=90
    )

    response.raise_for_status()

    result = response.json().get(
        "esearchresult", {}
    )

    if result.get("warninglist"):
        logger.warning(
            "PubMed search warnings: %s",
            result["warninglist"]
        )

    if "webenv" not in result:

        raise RuntimeError(
            "PubMed did not return a WebEnv."
        )

    return {

        "count": int(result.get("count", 0)),

        "webenv": result["webenv"],

        "query_key": result["querykey"]

    }


# =====================================================
# 18. FETCH BATCH USING EFETCH
# =====================================================

def fetch_batch(
    session,
    webenv,
    query_key,
    retstart,
    batch_size
):

    params = {

        "db": "pubmed",

        "query_key": query_key,

        "WebEnv": webenv,

        "retstart": retstart,

        "retmax": batch_size,

        "retmode": "xml"

    }

    params.update(common_params())

    response = session.get(
        EFetch_URL,
        params=params,
        timeout=120
    )

    response.raise_for_status()

    root = ET.fromstring(
        response.content
    )

    return root.findall(
        ".//PubmedArticle"
    )


# =====================================================
# 19. MAIN PUBMED SCRAPER
# =====================================================

def scrape_pubmed():

    logger.info("=" * 60)

    logger.info(
        "RESEARCHHUB PUBMED SCRAPER STARTED"
    )

    logger.info("=" * 60)

    if MAX_RECORDS <= 0 or BATCH_SIZE <= 0:

        raise ValueError(
            "MAX_RECORDS and BATCH_SIZE must be positive."
        )

    if not EMAIL:

        logger.warning(
            "PUBMED_EMAIL is empty. "
            "Set your email in .env as recommended by NCBI."
        )

    existing_ids = load_existing_ids()

    total = len(existing_ids)

    logger.info(
        "Existing unique PubMed records: %s",
        total
    )

    if total >= MAX_RECORDS:

        logger.info(
            "PubMed target already reached."
        )

        return

    checkpoint = load_checkpoint()

    today = date.today()

    current_date = checkpoint.get(
        "current_date",
        today.isoformat()
    )

    retstart = int(
        checkpoint.get("retstart", 0)
    )

    webenv = checkpoint.get("webenv")

    query_key = checkpoint.get("query_key")

    session = create_session()

    try:

        while total < MAX_RECORDS:

            # -------------------------------------------------
            # PREPARE DATE SEARCH
            # -------------------------------------------------

            if not webenv or not query_key:

                try:
                    search_result = search_pubmed_date(
                        session,
                        current_date
                    )

                except requests.RequestException as error:

                    logger.error(
                        "PubMed search request failed: %s",
                        error
                    )

                    break

                count = search_result["count"]

                webenv = search_result["webenv"]

                query_key = search_result["query_key"]

                retstart = 0

                logger.info(
                    "Date: %s | Matching records: %s",
                    current_date,
                    count
                )

                # ESearch only exposes up to 10,000
                # records per query in PubMed.
                if count > 10000:

                    raise RuntimeError(
                        f"{current_date} has {count} records. "
                        "This daily query exceeds the 10,000 "
                        "record ESearch limit."
                    )

                if count == 0:

                    current_date = (
                        date.fromisoformat(current_date)
                        - timedelta(days=1)
                    ).isoformat()

                    save_checkpoint({

                        "current_date": current_date,

                        "retstart": 0,

                        "webenv": None,

                        "query_key": None

                    })

                    webenv = None
                    query_key = None
                    retstart = 0

                    time.sleep(0.4)

                    continue

                save_checkpoint({

                    "current_date": current_date,

                    "retstart": retstart,

                    "webenv": webenv,

                    "query_key": query_key

                })

            # -------------------------------------------------
            # FETCH NEXT BATCH
            # -------------------------------------------------

            remaining = MAX_RECORDS - total

            current_batch_size = min(
                BATCH_SIZE,
                remaining
            )

            logger.info(
                "Fetching PubMed records: %s/%s | "
                "Date: %s | Position: %s",
                total,
                MAX_RECORDS,
                current_date,
                retstart
            )

            try:

                articles = fetch_batch(
                    session,
                    webenv,
                    query_key,
                    retstart,
                    current_batch_size
                )

            except requests.RequestException as error:

                logger.error(
                    "PubMed fetch failed: %s",
                    error
                )

                # Keep checkpoint so collection can resume.
                break

            except ET.ParseError as error:

                logger.error(
                    "Could not parse PubMed XML: %s",
                    error
                )

                break

            if not articles:

                logger.info(
                    "No more articles for %s.",
                    current_date
                )

                current_date = (
                    date.fromisoformat(current_date)
                    - timedelta(days=1)
                ).isoformat()

                webenv = None
                query_key = None
                retstart = 0

                save_checkpoint({

                    "current_date": current_date,

                    "retstart": 0,

                    "webenv": None,

                    "query_key": None

                })

                time.sleep(0.4)

                continue

            new_records = []

            for article in articles:

                record = clean_record(article)

                if not record:
                    continue

                pmid = record["pmid"]

                if pmid in existing_ids:
                    continue

                existing_ids.add(pmid)

                new_records.append(record)

                if total + len(new_records) >= MAX_RECORDS:
                    break

            # -------------------------------------------------
            # SAVE DATA
            # -------------------------------------------------

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
                    "PubMed target reached."
                )

                break

            # -------------------------------------------------
            # UPDATE POSITION
            # -------------------------------------------------

            retstart += len(articles)

            if retstart >= count:

                logger.info(
                    "Completed date: %s",
                    current_date
                )

                current_date = (
                    date.fromisoformat(current_date)
                    - timedelta(days=1)
                ).isoformat()

                webenv = None
                query_key = None
                retstart = 0

            save_checkpoint({

                "current_date": current_date,

                "retstart": retstart,

                "webenv": webenv,

                "query_key": query_key

            })

            # NCBI allows 3 requests per second without
            # an API key; use a conservative interval.
            time.sleep(0.4)

    except Exception:

        logger.exception(
            "Unexpected PubMed scraper error."
        )

    finally:

        session.close()

        logger.info("=" * 60)

        logger.info(
            "PUBMED SCRAPER FINISHED: %s/%s",
            total,
            MAX_RECORDS
        )

        logger.info("=" * 60)


# =====================================================
# 20. EXECUTION
# =====================================================

if __name__ == "__main__":

    scrape_pubmed()
