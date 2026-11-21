
import os
from pathlib import Path
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def get_connection():

    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", "3306")),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "researchhub"),
            charset="utf8mb4",
            use_unicode=True
        )

        if connection.is_connected():
            return connection

    except Error as error:
        print(f"MySQL connection error: {error}")

    return None
