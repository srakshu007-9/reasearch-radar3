
from database.db_connection import get_connection

connection = get_connection()

if connection:
    print("SUCCESS: MySQL connected!")
    print("Database:", connection.database)
    connection.close()
else:
    print("FAILED: Could not connect to MySQL.")
