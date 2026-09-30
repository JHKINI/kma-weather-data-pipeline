import os

from fastapi import FastAPI
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

app = FastAPI()

mysql_host = os.getenv("MYSQL_HOST")
mysql_port = os.getenv("MYSQL_PORT")
mysql_user = os.getenv("MYSQL_USER")
mysql_password = os.getenv("MYSQL_PASSWORD")
mysql_database = os.getenv("MYSQL_DATABASE")

engine = create_engine(
    f"mysql+pymysql://{mysql_user}:{mysql_password}"
    f"@{mysql_host}:{mysql_port}/{mysql_database}"
)


@app.get("/")
def root():
    return {"message": "Weather API is running"}
@app.get("/api/test-db")
def test_db():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        return {"mysql": result.scalar()}
@app.get("/api/weather")
def get_weather():
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT tm, stn, wd, ws, pa, ps, ta, td, hm
                FROM weather_observation
                ORDER BY tm DESC
                LIMIT 24
            """)
        )

        rows = [dict(row._mapping) for row in result]

        for row in rows:
            row["tm"] = row["tm"].isoformat()

        return rows