
import json
import re
from pathlib import Path
from datetime import datetime


# ==========================================
# CONFIGURATION
# ==========================================

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

INPUT_FILES = [
    "arxiv_papers.jsonl",
    "openalex_papers.jsonl",
    "crossref_papers.jsonl",
    "pubmed_papers.jsonl"
]

OUTPUT_FILE = DATA_DIR / "normalized_papers.jsonl"


# ==========================================
# DOI NORMALIZATION
# ==========================================

def normalize_doi(doi):
    if not doi:
        return None

    doi = str(doi).strip().lower()

    doi = re.sub(
        r"^https?://(dx\.)?doi\.org/",
        "",
        doi
    )

    doi = re.sub(r"^doi:\s*", "", doi)

    return doi or None


# ==========================================
# AUTHOR NORMALIZATION
# ==========================================

def normalize_authors(authors):

    if not authors:
        return []

    if isinstance(authors, str):
        return [authors.strip()] if authors.strip() else []

    if not isinstance(authors, list):
        return []

    result = []

    for author in authors:

        if isinstance(author, str):
            name = author.strip()

        elif isinstance(author, dict):

            given = author.get("given") or ""
            family = author.get("family") or ""

            name = (
                author.get("name")
                or author.get("display_name")
                or f"{given} {family}"
            )

            name = str(name).strip()

        else:
            continue

        if name and name not in result:
            result.append(name)

    return result


# ==========================================
# KEYWORD NORMALIZATION
# ==========================================

def normalize_list(value):

    if not value:
        return []

    if isinstance(value, str):
        return [value.strip()] if value.strip() else []

    if not isinstance(value, list):
        return []

    result = []

    for item in value:

        if isinstance(item, str):
            name = item.strip()

        elif isinstance(item, dict):
            name = (
                item.get("display_name")
                or item.get("name")
                or item.get("title")
                or ""
            )

            name = str(name).strip()

        else:
            continue

        if name and name not in result:
            result.append(name)

    return result


# ==========================================
# DATE NORMALIZATION
# ==========================================

def normalize_date(value):

    if not value:
        return None

    if isinstance(value, dict):

        value = (
            value.get("date")
            or value.get("date-parts")
            or value.get("date-time")
        )

        if isinstance(value, list):

            while isinstance(value, list):

                if not value:
                    return None

                value = value[0]

    if isinstance(value, (int, float)):
        value = str(int(value))

    if not isinstance(value, str):
        return None

    value = value.strip()

    formats = [
        "%Y-%m-%d",
        "%Y-%m",
        "%Y",
        "%Y/%m/%d",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%SZ"
    ]

    for fmt in formats:

        try:
            return datetime.strptime(
                value[:19],
                fmt
            ).date().isoformat()

        except ValueError:
            continue

    return None


# ==========================================
# SAFE INTEGER CONVERSION
# ==========================================

def safe_int(value):

    if value is None:
        return None

    try:
        return int(value)

    except (ValueError, TypeError):
        return None


# ==========================================
# PAPER NORMALIZATION
# ==========================================

def normalize_paper(record, filename):

    source = record.get("source")

    if not source:
        source = filename.replace(
            "_papers.jsonl",
            ""
        )

    source = str(source).lower()

    source_id = (
        record.get("arxiv_id")
        or record.get("openalex_id")
        or record.get("crossref_id")
        or record.get("pmid")
        or record.get("doi")
    )

    if not source_id:
        return None

    # Normalize publication date

    publication_date = normalize_date(
        record.get("publication_date")
        or record.get("published")
        or record.get("updated")
    )

    # Normalize publication year

    publication_year = safe_int(
        record.get("publication_year")
    )

    if not publication_year and publication_date:

        publication_year = int(
            publication_date[:4]
        )

    # Normalize citations

    citation_count = safe_int(
        record.get("cited_by_count")
        or record.get("is-referenced-by-count")
    )

    if citation_count is None:
        citation_count = 0

    # Normalize authors

    authors = normalize_authors(
        record.get("authors")
    )

    # Normalize keywords

    keywords = normalize_list(
        record.get("keywords")
        or record.get("categories")
        or record.get("topics")
        or record.get("subjects")
    )

    # Normalize title and abstract

    title = record.get("title") or ""
    abstract = record.get("abstract")

    if not isinstance(title, str):
        title = str(title)

    if abstract is not None and not isinstance(abstract, str):
        abstract = str(abstract)

    title = title.strip()

    if not title:
        return None

    # Standardized paper record

    normalized = {

        "source": source,

        "source_record_id": str(source_id),

        "doi": normalize_doi(
            record.get("doi")
        ),

        "arxiv_id": record.get("arxiv_id"),

        "openalex_id": record.get("openalex_id"),

        "crossref_id": record.get("crossref_id"),

        "pmid": (
            str(record.get("pmid"))
            if record.get("pmid")
            else None
        ),

        "title": title,

        "abstract": abstract,

        "authors": authors,

        "journal": record.get("journal"),

        "publisher": record.get("publisher"),

        "publication_date": publication_date,

        "publication_year": publication_year,

        "paper_type": record.get("type"),

        "keywords": keywords,

        "citation_count": citation_count,

        "paper_url": (
            record.get("paper_url")
            or record.get("landing_page_url")
            or record.get("url")
        ),

        "pdf_url": record.get("pdf_url"),

        # Preserve the original source record
        "source_metadata": record
    }

    return normalized


# ==========================================
# PROCESS INPUT FILES
# ==========================================

def process_file(filename, output):

    input_path = DATA_DIR / filename

    print("\n" + "=" * 50)
    print("Processing:", filename)
    print("=" * 50)

    if not input_path.exists():

        print("File not found:", input_path)

        return 0, 0

    valid_count = 0
    invalid_count = 0

    with input_path.open(
        "r",
        encoding="utf-8"
    ) as input_file:

        for line_number, line in enumerate(
            input_file,
            start=1
        ):

            if not line.strip():
                continue

            try:

                record = json.loads(line)

                paper = normalize_paper(
                    record,
                    filename
                )

                if paper is None:

                    invalid_count += 1
                    continue

                output.write(
                    json.dumps(
                        paper,
                        ensure_ascii=False
                    ) + "\n"
                )

                valid_count += 1

            except Exception as error:

                invalid_count += 1

                print(
                    f"Error at line {line_number}: {error}"
                )

    print("Normalized records:", valid_count)
    print("Invalid records:", invalid_count)

    return valid_count, invalid_count


# ==========================================
# MAIN FUNCTION
# ==========================================

def main():

    DATA_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    total_valid = 0
    total_invalid = 0

    total_input = 0

    print("\n")
    print("=" * 55)
    print("       RESEARCHHUB DATA NORMALIZATION")
    print("=" * 55)

    # Overwrite output file on each run

    with OUTPUT_FILE.open(
        "w",
        encoding="utf-8"
    ) as output:

        for filename in INPUT_FILES:

            valid, invalid = process_file(
                filename,
                output
            )

            total_valid += valid
            total_invalid += invalid

            total_input += valid + invalid

    print("\n")
    print("=" * 55)
    print("       NORMALIZATION COMPLETED")
    print("=" * 55)

    print("Total input records:", total_input)

    print("Valid normalized records:", total_valid)

    print("Invalid records:", total_invalid)

    print("Output file:", OUTPUT_FILE)

    print("=" * 55)


# ==========================================
# PROGRAM ENTRY POINT
# ==========================================

if __name__ == "__main__":
    main()
