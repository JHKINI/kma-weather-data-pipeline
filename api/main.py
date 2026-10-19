
import os
import pandas as pd
import time as time_module
import requests
from threading import Lock
from fastapi import HTTPException

from importlib.machinery import SourceFileLoader
from datetime import date, datetime, time, timedelta

from fastapi import FastAPI, Query
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI(
    title="KMA Weather API",
    description="기상청 ASOS 기상 데이터 조회 API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)
mysql_host = os.getenv("MYSQL_HOST")

if mysql_host == "host.docker.internal":
    mysql_host = "localhost"

mysql_port = os.getenv("MYSQL_PORT")
mysql_user = os.getenv("MYSQL_USER")
mysql_password = os.getenv("MYSQL_PASSWORD")
mysql_database = os.getenv("MYSQL_DATABASE")

engine = create_engine(
    f"mysql+pymysql://{mysql_user}:{mysql_password}"
    f"@{mysql_host}:{mysql_port}/{mysql_database}"
)

# 기존 ETL 파일의 품질 보고서 함수 재사용
etl_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "02_collect_weather.py",
)

etl_module = SourceFileLoader(
    "weather_etl",
    etl_path,
).load_module()

@app.get("/")
def root():
    return {"message": "Weather API is running"}


@app.get("/api/test-db")
def test_db():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        return {"mysql": result.scalar()}



# 공식 문서에서 확인한 관측소 목록
# 이름과 코드는 공식 문서 원본과 최종 대조할 것
OFFICIAL_STATIONS = {
    90: "속초",
    95: "철원",
    100: "대관령",
    101: "춘천",
    105: "강릉",
    108: "서울",
    112: "인천",
    114: "원주",
    119: "수원",
    127: "충주",
    129: "서산",
    130: "울진",
    131: "청주",
    133: "대전",
    135: "추풍령",
    136: "안동",
    138: "포항",
    140: "군산",
    143: "대구",
    146: "전주",
    152: "울산",
    155: "창원",
    156: "광주",
    159: "부산",
    162: "통영",
    165: "목포",
    168: "여수",
    170: "완도",
    192: "진주",
    201: "강화",
    202: "양평",
    203: "이천",
    211: "인제",
    212: "홍천",
    216: "태백",
    221: "제천",
    226: "보은",
    232: "천안",
    235: "보령",
    236: "부여",
    238: "금산",
    243: "부안",
    244: "임실",
    245: "정읍",
    247: "남원",
    248: "장수",
    260: "장흥",
    261: "해남",
    262: "고창",
    271: "봉화",
    272: "영주",
    273: "문경",
    277: "영덕",
    278: "의성",
    279: "구미",
    281: "영천",
    284: "거창",
    285: "합천",
    288: "밀양",
    289: "산청",
    294: "거제",
    295: "남해",
}


@app.get("/api/weather")
def get_weather(
    target_date: date | None = Query(
        default=None,
        alias="date",
        description="조회할 날짜 (예: 2026-10-17)",
    ),
    stn: int = Query(
        ...,
        description="관측소 지점번호",
    ),
    start: datetime | None = Query(
        default=None,
        description="조회 시작 일시",
    ),
    end: datetime | None = Query(
        default=None,
        description="조회 종료 일시(미포함)",
    ),
):
    # 공식 목록에 없는 지점은 조회하지 않음
    if stn not in OFFICIAL_STATIONS:
        raise HTTPException(
            status_code=400,
            detail="공식 관측소 목록에 없는 지점번호입니다.",
        )

    # 날짜 조회와 시간 범위 조회를 동시에 지정하지 않도록 처리
    if target_date is not None and (start is not None or end is not None):
        raise HTTPException(
            status_code=400,
            detail="date와 start/end를 동시에 사용할 수 없습니다.",
        )

    if (start is None) != (end is None):
        raise HTTPException(
            status_code=400,
            detail="start와 end를 함께 입력해야 합니다.",
        )

    if start is not None and end is not None:
        if start >= end:
            raise HTTPException(
                status_code=400,
                detail="종료 일시는 시작 일시보다 늦어야 합니다.",
            )
        start_time = start
        end_time = end

    elif target_date is not None:
        start_time = datetime.combine(target_date, time.min)
        end_time = start_time + timedelta(days=1)

    else:
        # 기존 기본 동작: 해당 지점의 최신 24건
        sql = text("""
            SELECT tm, stn, wd, ws, pa, ps, ta, td, hm
            FROM weather_observation
            WHERE stn = :stn
            ORDER BY tm DESC
            LIMIT 24
        """)
        params = {"stn": stn}

        with engine.connect() as connection:
            result = connection.execute(sql, params)
            rows = [dict(row._mapping) for row in result]

        rows.reverse()
        for row in rows:
            row["tm"] = row["tm"].isoformat()

        return {
            "station_code": stn,
            "station_name": OFFICIAL_STATIONS[stn],
            "query_date": None,
            "start": None,
            "end": None,
            "count": len(rows),
            "data": rows,
        }

    sql = text("""
        SELECT tm, stn, wd, ws, pa, ps, ta, td, hm
        FROM weather_observation
        WHERE stn = :stn
          AND tm >= :start_time
          AND tm < :end_time
        ORDER BY tm ASC
    """)

    params = {
        "stn": stn,
        "start_time": start_time,
        "end_time": end_time,
    }

    with engine.connect() as connection:
        result = connection.execute(sql, params)
        rows = [dict(row._mapping) for row in result]

    for row in rows:
        row["tm"] = row["tm"].isoformat()

    return {
        "station_code": stn,
        "station_name": OFFICIAL_STATIONS[stn],
        "query_date": target_date.isoformat() if target_date else None,
        "start": start_time.isoformat(),
        "end": end_time.isoformat(),
        "count": len(rows),
        "data": rows,
    }


@app.get("/api/quality")
def get_weather_quality(
    target_date: date = Query(
        ...,
        alias="date",
        description="검증할 날짜 (예: 2026-09-15)",
    )
):
    start_time = datetime.combine(target_date, time.min)
    end_time = start_time + timedelta(days=1)

    sql = text("""
        SELECT tm, stn, wd, ws, pa, ps, ta, td, hm
        FROM weather_observation
        WHERE tm >= :start_time
          AND tm < :end_time
        ORDER BY tm ASC
    """)

    with engine.connect() as connection:
        result = connection.execute(
            sql,
            {
                "start_time": start_time,
                "end_time": end_time,
            },
        )
        rows = [dict(row._mapping) for row in result]

    if not rows:
        return {
            "query_date": target_date.isoformat(),
            "count": 0,
            "status": "NO_DATA",
            "message": "해당 날짜에 저장된 데이터가 없습니다.",
            "report": None,
        }

    df = pd.DataFrame(rows)

    # ETL 품질 검증 함수가 사용하는 컬럼명으로 변환
    df.columns = [column.upper() for column in df.columns]
    df["TM"] = pd.to_datetime(df["TM"])

    report = etl_module.get_quality_report(df)

    return {
        "query_date": target_date.isoformat(),
        "count": len(df),
        "status": report["status"],
        "report": report,
    }

# Airflow API 인증 및 토큰 캐시
AIRFLOW_API_URL = os.getenv(
    "AIRFLOW_API_URL", "http://localhost:8082"
).rstrip("/")
AIRFLOW_USERNAME = os.getenv("AIRFLOW_USERNAME", "")
AIRFLOW_PASSWORD = os.getenv("AIRFLOW_PASSWORD", "")

_airflow_token = None
_airflow_token_expires_at = 0
_airflow_token_lock = Lock()


def get_airflow_token(force_refresh=False):
    global _airflow_token, _airflow_token_expires_at

    with _airflow_token_lock:
        if (
            not force_refresh
            and _airflow_token
            and time_module.time() < _airflow_token_expires_at
        ):
            return _airflow_token

        if not AIRFLOW_USERNAME or not AIRFLOW_PASSWORD:
            raise RuntimeError("Airflow 계정 정보가 설정되지 않았습니다.")

        response = requests.post(
            f"{AIRFLOW_API_URL}/auth/token",
            json={
                "username": AIRFLOW_USERNAME,
                "password": AIRFLOW_PASSWORD,
            },
            timeout=10,
        )
        response.raise_for_status()

        token_data = response.json()
        _airflow_token = token_data.get("access_token")

        if not _airflow_token:
            raise RuntimeError("Airflow 토큰 응답에 access_token이 없습니다.")

        # 토큰 만료 전에 갱신하도록 50분간 캐시
        _airflow_token_expires_at = time_module.time() + 50 * 60
        return _airflow_token


@app.get("/api/pipeline/runs")
def get_pipeline_runs():
    try:
        for attempt in range(2):
            token = get_airflow_token(force_refresh=(attempt == 1))

            response = requests.get(
                f"{AIRFLOW_API_URL}/api/v2/dags/weather_etl/dagRuns",
                headers={"Authorization": f"Bearer {token}"},
                params={"limit": 5, "order_by": "-logical_date"},
                timeout=10,
            )

            if response.status_code == 401 and attempt == 0:
                continue

            response.raise_for_status()
            payload = response.json()

            return {
                "status": "OK",
                "runs": [
                    {
                        "dag_id": run.get("dag_id"),
                        "dag_run_id": run.get("dag_run_id"),
                        "logical_date": run.get("logical_date"),
                        "state": run.get("state"),
                        "start_date": run.get("start_date"),
                        "end_date": run.get("end_date"),
                    }
                    for run in payload.get("dag_runs", [])
                ],
            }

        return {
            "status": "AUTH_ERROR",
            "message": "Airflow 인증에 실패했습니다. 계정 정보를 확인하세요.",
            "runs": [],
        }

    except requests.RequestException as exc:
        return {
            "status": "AIRFLOW_ERROR",
            "message": f"Airflow API 요청에 실패했습니다: {type(exc).__name__}",
            "runs": [],
        }
    except RuntimeError as exc:
        return {
            "status": "CONFIG_ERROR",
            "message": str(exc),
            "runs": [],
        }
