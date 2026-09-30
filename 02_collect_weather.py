import requests
import os
import pandas as pd
from dotenv import load_dotenv
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text


# ============================================================
# 1. 환경변수 불러오기
# ============================================================

load_dotenv()

auth_key = os.getenv("KMA_AUTH_KEY")


# ============================================================
# 2. 날씨 데이터 수집
# ============================================================

def collect_weather():

    # 실행일 기준 어제 하루
    yesterday = datetime.now() - timedelta(days=1)

    tm1 = yesterday.strftime("%Y%m%d") + "0000"
    tm2 = yesterday.strftime("%Y%m%d") + "2300"

    url = "https://apihub.kma.go.kr/api/typ01/url/kma_sfctm3.php"

    params = {
        "tm1": tm1,
        "tm2": tm2,
        "stn": "108",
        "authKey": auth_key
    }

    response = requests.get(url, params=params)

    print("상태 코드:", response.status_code)

    lines = response.text.splitlines()

    data_lines = [
        line.strip()
        for line in lines
        if line.strip() and not line.startswith("#")
    ]

    print("데이터 행 수:", len(data_lines))

    data = [line.split() for line in data_lines]

    selected_indices = [0, 1, 2, 3, 7, 8, 11, 12, 13]

    data_selected = [
        [row[i] for i in selected_indices]
        for row in data
    ]

    columns = [
        "TM",
        "STN",
        "WD",
        "WS",
        "PA",
        "PS",
        "TA",
        "TD",
        "HM"
    ]

    df = pd.DataFrame(
        data_selected,
        columns=columns
    )

    return df


# ============================================================
# 3. 데이터 전처리
# ============================================================

def transform_weather(df):

    # 날짜시간 변환
    df["TM"] = pd.to_datetime(
        df["TM"],
        format="%Y%m%d%H%M"
    )

    # 숫자형 변환
    numeric_columns = [
        "WD",
        "WS",
        "PA",
        "PS",
        "TA",
        "TD",
        "HM"
    ]

    for column in numeric_columns:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce"
        )

    # 기상청 결측값 처리
    df = df.replace(
        [-9, -9.0],
        pd.NA
    )

    print("\n===== 결측값 개수 =====")
    print(df.isna().sum())

    print("\n===== 결측률 =====")
    print(df.isna().mean() * 100)

    return df

def quality_check_weather(df):

    print("\n===== DATA QUALITY CHECK =====")

    # 1. 전체 데이터 건수
    print(f"전체 데이터: {len(df)}건")

    # 2. 결측값 검사
    missing_count = df.isna().sum().sum()
    print(f"결측값: {missing_count}건")

 # 3. 중복 검사
    duplicate_count = df.duplicated(
        subset=["TM", "STN"]
    ).sum()
    print(f"중복 데이터: {duplicate_count}건")

    # 3-1. 시간 순서 검사
    time_order_error = not df["TM"].is_monotonic_increasing
    print(f"시간 순서 오류: {time_order_error}")

    # 3-2. 시간 간격 검사
    time_diff = df["TM"].sort_values().diff().dropna()
    time_interval_error = not time_diff.eq(pd.Timedelta(hours=1)).all()
    print(f"1시간 간격 오류: {time_interval_error}")
    # 4. 값의 허용 범위 검사
    range_errors = {}

    if not df["WD"].dropna().between(0, 360).all():
        range_errors["WD"] = "0~360 범위 초과"

    if not df["WS"].dropna().ge(0).all():
        range_errors["WS"] = "0 미만"

    if not df["HM"].dropna().between(0, 100).all():
        range_errors["HM"] = "0~100 범위 초과"

    if not df["TA"].dropna().between(-50, 60).all():
        range_errors["TA"] = "-50~60℃ 범위 초과"

    print(f"범위 오류: {range_errors}")

    if (
    missing_count == 0
    and duplicate_count == 0
    and not time_order_error
    and not time_interval_error
    and not range_errors
):
        print("품질검증 결과: PASS")
        return True

    print("품질검증 결과: FAIL")
    raise ValueError("데이터 품질검증 실패")
# ============================================================
# 4. CSV 저장
# ============================================================

def save_csv(df):

    df.to_csv(
        "weather_data.csv",
        index=False,
        encoding="utf-8-sig"
    )

    print("\nCSV 저장 완료: weather_data.csv")


# ============================================================
# 5. MySQL 적재
# ============================================================

def load_to_mysql(df):

    # MySQL 연결 정보
    mysql_host = os.getenv("MYSQL_HOST")
    mysql_port = os.getenv("MYSQL_PORT")
    mysql_user = os.getenv("MYSQL_USER")
    mysql_password = os.getenv("MYSQL_PASSWORD")
    mysql_database = os.getenv("MYSQL_DATABASE")

    # MySQL 연결
    engine = create_engine(
        f"mysql+pymysql://{mysql_user}:{mysql_password}"
        f"@{mysql_host}:{mysql_port}/{mysql_database}"
    )

    # MySQL 컬럼명에 맞게 소문자로 변경
    df.columns = df.columns.str.lower()

    # 중복 데이터는 무시
    insert_sql = text("""
        INSERT IGNORE INTO weather_observation
        (tm, stn, wd, ws, pa, ps, ta, td, hm)
        VALUES
        (:tm, :stn, :wd, :ws, :pa, :ps, :ta, :td, :hm)
    """)

    records = df.to_dict(
        orient="records"
    )

    with engine.begin() as connection:

        result = connection.execute(
            insert_sql,
            records
        )

    print(f"\n전체 수집 데이터: {len(df)}건")
    print(f"신규 적재 데이터: {result.rowcount}건")
    print("MySQL 적재 완료!")


# ============================================================
# 6. 프로그램 실행
# ============================================================

if __name__ == "__main__":
    df = collect_weather()
    df = transform_weather(df)
    quality_check_weather(df)
    save_csv(df)
    load_to_mysql(df)
