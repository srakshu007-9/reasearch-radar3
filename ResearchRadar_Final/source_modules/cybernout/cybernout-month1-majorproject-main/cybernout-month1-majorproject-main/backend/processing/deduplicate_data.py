
import json
import re
import hashlib
import logging
from pathlib import Path
from collections import defaultdict

# ============================================================
# RESEARCHHUB - DATA DEDUPLICATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
INPUT_FILE = BASE_DIR / "data" / "normalized_papers.jsonl"

CANONICAL_FILE = BASE_DIR / "data" / "canonical_papers.jsonl"
SOURCES_FILE = BASE_DIR / "data" / "paper_sources.jsonl"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger("ResearchHubDeduplication")


# ============================================================
# UNION FIND
# Used to group records representing the same paper.
# ============================================================

class UnionFind:

    def __init__(self, size):
        self.parent = list(range(size))
        self.rank = [0] * size

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x, y):
        root_x = self.find(x)
        root_y = self.find(y)

        if root_x == root_y:
            return

        if self.rank[root_x] < self.rank[root_y]:
            self.parent[root_x] = root_y

        elif self.rank[root_x] > self.rank[root_y]:
            self.parent[root_y] = root_x

        else:
            self.parent[root_y] = root_x
            self.rank[root_x] += 1


# ============================================================
# IDENTIFIER NORMALIZATION
# ============================================================

def normalize_doi(value):

    if not value:
        return None

    value = str(value).strip().lower()

    value = re.sub(
        r"^https?://(dx\.)?doi\.org/",
        "",
        value
    )

    value = re.sub(r"^doi:\s*", "", value)

    value = value.strip()

    return value or None


def normalize_arxiv_id(value):

    if not value:
        return None

    value = str(value).strip().lower()

    value = re.sub(
        r"^(https?://)?(www\.)?arxiv\.org/(abs|pdf)/",
        "",
        value
    )

    value = re.sub(r"\.pdf$", "", value)

    # Remove version suffix, for example:
    # 2401.12345v2 -> 2401.12345
    value = re.sub(r"v\d+$", "", value)

    return value or None


def normalize_pmid(value):

    if not value:
        return None

    value = str(value).strip()

    value = re.sub(r"^pmid:\s*", "", value, flags=re.I)

    return value or None


def normalize_openalex_id(value):

    if not value:
        return None

    value = str(value).strip().rstrip("/")

    return value.lower() or None


# ============================================================
# CREATE MATCHING IDENTIFIERS
# ============================================================

def get_identifiers(paper):

    identifiers = []

    doi = normalize_doi(paper.get("doi"))

    arxiv_id = normalize_arxiv_id(
        paper.get("arxiv_id")
    )

    pmid = normalize_pmid(
        paper.get("pmid")
    )

    openalex_id = normalize_openalex_id(
        paper.get("openalex_id")
    )

    # DOI
    if doi:
        identifiers.append(("doi", doi))

    # arXiv ID
    if arxiv_id:
        identifiers.append(("arxiv", arxiv_id))

    # PMID
    if pmid:
        identifiers.append(("pmid", pmid))

    # OpenAlex ID
    if openalex_id:
        identifiers.append(("openalex", openalex_id))

    return identifiers


# ============================================================
# LOAD NORMALIZED DATA
# ============================================================

def load_records():

    records = []

    logger.info("Loading normalized records...")

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Input file not found: {INPUT_FILE}"
        )

    with open(INPUT_FILE, "r", encoding="utf-8") as file:

        for line_number, line in enumerate(file, start=1):

            if not line.strip():
                continue

            try:
                paper = json.loads(line)

                if not isinstance(paper, dict):
                    continue

                if not paper.get("title"):
                    continue

                records.append(paper)

            except json.JSONDecodeError:
                logger.warning(
                    "Invalid JSON at line %s",
                    line_number
                )

    logger.info("Records loaded: %s", len(records))

    return records


# ============================================================
# GROUP DUPLICATES
# ============================================================

def group_duplicates(records):

    logger.info("Starting duplicate identification...")

    union_find = UnionFind(len(records))

    identifier_map = {}

    matched_count = 0

    for index, paper in enumerate(records):

        identifiers = get_identifiers(paper)

        for identifier_type, identifier_value in identifiers:

            key = (identifier_type, identifier_value)

            if key in identifier_map:

                existing_index = identifier_map[key]

                union_find.union(index, existing_index)

                matched_count += 1

            else:
                identifier_map[key] = index

    groups = defaultdict(list)

    for index, paper in enumerate(records):

        root = union_find.find(index)

        groups[root].append(paper)

    logger.info(
        "Identifier matches found: %s",
        matched_count
    )

    logger.info(
        "Paper groups created: %s",
        len(groups)
    )

    return list(groups.values())


# ============================================================
# GENERATE CANONICAL PAPER ID
# ============================================================

def generate_canonical_id(group):

    identifiers = set()

    for paper in group:

        for identifier in get_identifiers(paper):

            identifiers.add(
                f"{identifier[0]}:{identifier[1]}"
            )

    if identifiers:
        identity = "|".join(sorted(identifiers))

    else:
        # Records without reliable identifiers are kept separate.
        source_ids = sorted(
            str(paper.get("source", "")) + ":" +
            str(paper.get("source_record_id", ""))
            for paper in group
        )

        identity = "|".join(source_ids)

    digest = hashlib.sha256(
        identity.encode("utf-8")
    ).hexdigest()[:20]

    return "RH-" + digest.upper()


# ============================================================
# MERGE PAPER INFORMATION
# ============================================================

def merge_group(group):

    # Prefer records with more complete metadata.
    group = sorted(
        group,
        key=lambda paper: (
            sum(
                1 for key in [
                    "abstract",
                    "doi",
                    "authors",
                    "publication_date",
                    "journal",
                    "publisher",
                    "paper_url",
                    "pdf_url"
                ]
                if paper.get(key)
            ),
            len(str(paper.get("abstract") or ""))
        ),
        reverse=True
    )

    primary = group[0]

    merged = dict(primary)

    # Collect all identifiers and sources.
    dois = set()
    arxiv_ids = set()
    pmids = set()
    openalex_ids = set()
    sources = set()

    authors = []
    keywords = []

    for paper in group:

        if paper.get("doi"):
            value = normalize_doi(paper["doi"])
            if value:
                dois.add(value)

        if paper.get("arxiv_id"):
            value = normalize_arxiv_id(paper["arxiv_id"])
            if value:
                arxiv_ids.add(value)

        if paper.get("pmid"):
            value = normalize_pmid(paper["pmid"])
            if value:
                pmids.add(value)

        if paper.get("openalex_id"):
            value = normalize_openalex_id(
                paper["openalex_id"]
            )
            if value:
                openalex_ids.add(value)

        if paper.get("source"):
            sources.add(paper["source"])

        for author in paper.get("authors") or []:

            if isinstance(author, dict):
                author = (
                    author.get("name")
                    or author.get("display_name")
                    or ""
                )

            if author:
                author = str(author).strip()

                if author and author not in authors:
                    authors.append(author)

        for keyword in paper.get("keywords") or []:

            if isinstance(keyword, dict):
                keyword = (
                    keyword.get("name")
                    or keyword.get("display_name")
                    or ""
                )

            if keyword:
                keyword = str(keyword).strip()

                if keyword and keyword not in keywords:
                    keywords.append(keyword)

    # Preserve all source records separately.
    merged["canonical_id"] = generate_canonical_id(group)

    merged["dois"] = sorted(dois)
    merged["arxiv_ids"] = sorted(arxiv_ids)
    merged["pmids"] = sorted(pmids)
    merged["openalex_ids"] = sorted(openalex_ids)

    merged["sources"] = sorted(sources)

    merged["authors"] = authors
    merged["keywords"] = keywords

    merged["source_record_count"] = len(group)

    return merged


# ============================================================
# SAVE CANONICAL PAPERS
# ============================================================

def save_canonical_papers(groups):

    logger.info("Saving canonical papers...")

    with open(
        CANONICAL_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        for group in groups:

            canonical = merge_group(group)

            file.write(
                json.dumps(
                    canonical,
                    ensure_ascii=False,
                    default=str
                ) + "\n"
            )

    logger.info(
        "Canonical file saved: %s",
        CANONICAL_FILE
    )


# ============================================================
# SAVE ORIGINAL SOURCE RECORDS
# ============================================================

def save_source_records(groups):

    logger.info("Saving source records...")

    with open(
        SOURCES_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        for group in groups:

            canonical_id = generate_canonical_id(group)

            for paper in group:

                source_record = dict(paper)

                source_record["canonical_id"] = canonical_id

                file.write(
                    json.dumps(
                        source_record,
                        ensure_ascii=False,
                        default=str
                    ) + "\n"
                )

    logger.info(
        "Source file saved: %s",
        SOURCES_FILE
    )


# ============================================================
# FINAL REPORT
# ============================================================

def print_report(records, groups):

    total_records = len(records)

    unique_papers = len(groups)

    duplicate_records = total_records - unique_papers

    multi_source_groups = sum(
        1 for group in groups
        if len({
            paper.get("source")
            for paper in group
            if paper.get("source")
        }) > 1
    )

    duplicate_groups = sum(
        1 for group in groups
        if len(group) > 1
    )

    print("\n")
    print("=" * 60)
    print("       RESEARCHHUB DEDUPLICATION REPORT")
    print("=" * 60)

    print(f"Total normalized records : {total_records}")
    print(f"Unique canonical papers  : {unique_papers}")
    print(f"Duplicate records        : {duplicate_records}")
    print(f"Duplicate groups         : {duplicate_groups}")
    print(f"Multi-source paper groups: {multi_source_groups}")

    print("-" * 60)

    print(f"Canonical output: {CANONICAL_FILE}")
    print(f"Source output   : {SOURCES_FILE}")

    print("=" * 60)


# ============================================================
# MAIN
# ============================================================

def main():

    print("\n")
    print("=" * 60)
    print("       RESEARCHHUB DATA DEDUPLICATION")
    print("=" * 60)

    records = load_records()

    if not records:
        logger.error("No valid records found.")
        return

    groups = group_duplicates(records)

    save_canonical_papers(groups)

    save_source_records(groups)

    print_report(records, groups)


if __name__ == "__main__":
    main()
