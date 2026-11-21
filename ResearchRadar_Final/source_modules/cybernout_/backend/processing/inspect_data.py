
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_FOLDER = BASE_DIR / "data"

FILES = [
    "arxiv_papers.jsonl",
    "openalex_papers.jsonl",
    "crossref_papers.jsonl",
    "pubmed_papers.jsonl"
]


def inspect_file(filename):
    file_path = DATA_FOLDER / filename

    print("\n" + "=" * 50)
    print("FILE:", filename)
    print("=" * 50)

    if not file_path.exists():
        print("File not found!")
        return

    total_records = 0
    valid_records = 0

    with file_path.open("r", encoding="utf-8") as file:
        for line_number, line in enumerate(file, start=1):
            if not line.strip():
                continue

            total_records += 1

            try:
                record = json.loads(line)
                valid_records += 1

                if valid_records == 1:
                    print("Available fields:")
                    print(list(record.keys()))

                    print("\nSample title:")
                    print(record.get("title", "No title found"))

            except json.JSONDecodeError:
                print(f"Invalid JSON at line {line_number}")

    print("\nTotal records:", total_records)
    print("Valid records:", valid_records)


def main():
    print("RESEARCHHUB DATA INSPECTION")

    for filename in FILES:
        inspect_file(filename)

    print("\nData inspection completed!")


if __name__ == "__main__":
    main()
