"""Create the ResearchRadar MySQL database and tables.

Run from backend with: python setup_database.py
Works with Python 3.14 and MySQL 8.0+.
"""
from pathlib import Path
import os

import mysql.connector
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def main():
    database = os.getenv("DB_NAME", "researchhub")
    connection = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        charset="utf8mb4",
        use_unicode=True,
        connection_timeout=10,
    )
    cursor = connection.cursor()
    try:
        cursor.execute(
            f"CREATE DATABASE IF NOT EXISTS `{database}` "
            "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        )
    finally:
        cursor.close()
        connection.close()

    connection = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=database,
        charset="utf8mb4",
        use_unicode=True,
        connection_timeout=10,
    )
    cursor = connection.cursor()
    try:
        schema = (BASE_DIR / "database" / "schema.sql").read_text(encoding="utf-8")
        statements = []
        for statement in schema.split(";"):
            statement = statement.strip()
            if not statement or statement.upper().startswith(("CREATE DATABASE", "USE ")):
                continue
            statements.append(statement)
        for statement in statements:
            cursor.execute(statement)
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()
    print(f"ResearchRadar database '{database}' and tables are ready.")


if __name__ == "__main__":
    main()
