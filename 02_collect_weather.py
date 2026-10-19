import requests
import os
import pandas as pd
from dotenv import load_dotenv
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text

import time
from requests.exceptions import RequestException


# ============================================================
# 1. 환경변수 불러오기
# ============================================================

load_dotenv()

auth_key = os.getenv("KMA_AUTH_KEY")


# ============================================================
# 2. 날씨 데이터 수집
# ============================================================

#def collect_weather():

    # 실행일 기준 어제 하루
 #   yesterday = datetime.now() - timedelta(days=1)

  #  tm1 = yesterday.strftime("%Y%m%d") + "0000"
 # tm2 = yesterday.strftime("%Y%m%d") + "2300"
def collect_weather(target_date=None):

    # 날짜를 지정하지 않으면 기존처럼 어제 수집
    if target_date is None:
        target_date = (datetime.now() - timedelta(days=1)).date()
    elif isinstance(target_date, str):
        target_date = datetime.strptime(
            target_date, "%Y-%m-%d"
        ).date()

    tm1 = target_date.strftime("%Y%m%d") + "0000"
    tm2 = target_date.strftime("%Y%m%d") + "2300"
    url = "https://apihub.kma.go.kr/api/typ01/url/kma_sfctm3.php"

    params = {
        "tm1": tm1,
        "tm2": tm2,
        "stn": "0",
        "authKey": auth_key
    }

   # 기상청 API 요청: 최대 3회 시도

    # 기상청 API 요청: 최대 3회 시도
    response = None

    for attempt in range(1, 4):
        try:
            response = requests.get(
                url,
                params=params,
                timeout=(10, 60)
            )
            response.raise_for_status()
            break

        except RequestException as e:
            print(f"API 요청 실패 ({attempt}/3): {e}")

            if attempt == 3:
                raise

            time.sleep(2 * attempt)

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
#30일 수집함수
def backfill_weather(start_date, end_date):
    start = datetime.strptime(start_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_date, "%Y-%m-%d").date()

    if start > end:
        raise ValueError("시작 날짜는 종료 날짜보다 늦을 수 없습니다.")

    current = start

    while current <= end:
        date_str = current.isoformat()
        print(f"\n===== 과거 데이터 수집: {date_str} =====")

        try:
            df = collect_weather(date_str)
            df = transform_weather(df)

            quality_check_weather(df)
            load_to_mysql(df)

            print(f"[성공] {date_str}: {len(df)}건 수집")

        except Exception as exc:
            print(f"[실패] {date_str}: {type(exc).__name__}: {exc}")

        current += timedelta(days=1)

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

    
   
    # 결측치 처리: 컬럼별로 적용
    # -9: 온도 컬럼(TA, TD)에는 일괄 적용하지 않음
    for column in ["WD", "WS", "PA", "PS", "HM"]:
        df[column] = df[column].replace([-9, -9.0], pd.NA)

    # -99: 실제 데이터에서 관측된 비정상 온도값을 결측 처리
    # 공식 문서에서 TA/TD의 공통 결측 코드로 확정된 것은 아니므로
    # 현재는 관측값과 물리적 허용 범위를 근거로 한 처리 규칙임
    for column in ["TA", "TD"]:
        df[column] = df[column].replace([-99, -99.0], pd.NA)

    print("\n===== 결측값 개수 =====")
    print(df.isna().sum())

    print("\n===== 결측률 =====")
    print(df.isna().mean() * 100)


    return df

def quality_check_weather(df):

    print("\n===== DATA QUALITY CHECK =====")

    # 1. 전체 데이터 건수
    print(f"전체 데이터: {len(df)}건")

    # 데이터가 아예 없으면 중단
    if df.empty:
        raise ValueError("데이터 품질검증 실패: 데이터가 없습니다.")

    # 필수 컬럼 검사
    required_columns = [
        "TM", "STN", "WD", "WS", "PA", "PS", "TA", "TD", "HM"
    ]

    missing_columns = [
        col for col in required_columns if col not in df.columns
    ]

    if missing_columns:
        raise ValueError(f"필수 컬럼 누락: {missing_columns}")

    # 2. 결측값 검사: 결측이 있어도 저장 가능하도록 경고만 출력
    missing_count = int(df.isna().sum().sum())
    print(f"전체 결측값: {missing_count}건")

    measurement_columns = ["WD", "WS", "PA", "PS", "TA", "TD", "HM"]

    for col in measurement_columns:
        count = int(df[col].isna().sum())
        if count > 0:
            print(f"[결측 경고] {col}: {count}건")

    # 관측 시간과 관측소 코드는 결측 허용하지 않음
    if df["TM"].isna().any() or df["STN"].isna().any():
        raise ValueError("데이터 품질검증 실패: TM 또는 STN 결측")

    # 3. 중복 검사
    duplicate_count = int(
        df.duplicated(subset=["TM", "STN"]).sum()
    )
    print(f"중복 데이터: {duplicate_count}건")

    if duplicate_count > 0:
        raise ValueError("데이터 품질검증 실패: 중복 데이터 존재")

    # 4. 지점별 시간 순서 검사
    time_order_error = False

    for stn, group in df.groupby("STN"):
        times = group["TM"]

        if not times.is_monotonic_increasing:
            time_order_error = True
            print(f"[시간 순서 경고] 지점: {stn}")

    print(f"시간 순서 오류: {time_order_error}")

    # 5. 지점별 시간 간격 검사
    # 실제 관측 누락은 가능하므로 기록하되, 이것만으로 중단하지 않음
    time_interval_error = False

    for stn, group in df.groupby("STN"):
        times = group["TM"].sort_values()
        time_diff = times.diff().dropna()

        if not time_diff.eq(pd.Timedelta(hours=1)).all():
            time_interval_error = True
            print(f"[시간 간격 경고] 지점: {stn}")

    print(f"1시간 간격 오류: {time_interval_error}")

    # 6. 측정값 허용 범위 검사
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

    if range_errors:
        raise ValueError(
            f"데이터 품질검증 실패: 측정값 범위 오류 {range_errors}"
        )

    print("품질검증 결과: PASS")
    print("※ 측정값 결측 및 시간 간격 오류는 경고로 기록했습니다.")

    return True
# ============================================================
# 3_2. 검증결과생성
# ============================================================

def get_quality_report(df):
    """웹 대시보드에 표시할 데이터 품질 검증 결과 반환"""

    missing_count = int(df.isna().sum().sum())
    duplicate_count = int(
        df.duplicated(subset=["TM", "STN"]).sum()
    )

    time_order_error = not df["TM"].is_monotonic_increasing

    time_diff = df["TM"].sort_values().diff().dropna()
    time_interval_error = not time_diff.eq(
        pd.Timedelta(hours=1)
    ).all()

    range_errors = {}

    if not df["WD"].dropna().between(0, 360).all():
        range_errors["WD"] = "0~360 범위 초과"

    if not df["WS"].dropna().ge(0).all():
        range_errors["WS"] = "0 미만"

    if not df["HM"].dropna().between(0, 100).all():
        range_errors["HM"] = "0~100 범위 초과"

    if not df["TA"].dropna().between(-50, 60).all():
        range_errors["TA"] = "-50~60℃ 범위 초과"

    passed = (
        missing_count == 0
        and duplicate_count == 0
        and not time_order_error
        and not range_errors
    )

    return {
        "total_count": len(df),
        "missing_count": missing_count,
        "duplicate_count": duplicate_count,
        "time_order_error": time_order_error,
        "time_interval_error": time_interval_error,
        "range_errors": range_errors,
        "status": "PASS" if passed else "FAIL",
    }

# ============================================================
# 4.records = df CSV 저장
# ============================================================



def save_csv(df):
    import os

    output_path = os.getenv(
        "WEATHER_CSV_PATH",
        os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     "weather_data.csv")
    )

    output_dir = os.path.dirname(output_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    df.to_csv(
        output_path,
        index=False,
        encoding="utf-8-sig"
    )

    print(f"\nCSV 저장 완료: {output_path}")

# ============================================================
# 5. MySQL 적재
# ============================================================


def load_to_mysql(df):
    """기존 유효값을 보존하고 NULL만 보완하는 UPSERT 적재"""

    from sqlalchemy import create_engine, text
    import os
    import pandas as pd

    mysql_host = os.getenv("MYSQL_HOST")
    mysql_port = os.getenv("MYSQL_PORT")
    mysql_user = os.getenv("MYSQL_USER")
    mysql_password = os.getenv("MYSQL_PASSWORD")
    mysql_database = os.getenv("MYSQL_DATABASE")

    required_columns = [
        "TM", "STN", "WD", "WS", "PA", "PS", "TA", "TD", "HM"
    ]

    missing_columns = [
        col for col in required_columns if col not in df.columns
    ]
    if missing_columns:
        raise ValueError(f"필수 컬럼 누락: {missing_columns}")

    if df.empty:
        raise ValueError("적재 실패: 데이터가 없습니다.")

    # 원본 DataFrame을 변경하지 않고 복사
    df = df[required_columns].copy()
    df.columns = [col.lower() for col in df.columns]

    # 숫자형 결측값을 Python None으로 변환
    records = (
        df.astype(object)
        .where(pd.notna(df), None)
        .to_dict(orient="records")
    )

    engine = create_engine(
        f"mysql+pymysql://{mysql_user}:{mysql_password}"
        f"@{mysql_host}:{mysql_port}/{mysql_database}"
    )

    upsert_sql = text("""
        INSERT INTO weather_observation
            (tm, stn, wd, ws, pa, ps, ta, td, hm)
        VALUES
            (:tm, :stn, :wd, :ws, :pa, :ps, :ta, :td, :hm)
        AS new
        ON DUPLICATE KEY UPDATE
            wd = COALESCE(weather_observation.wd, new.wd),
            ws = COALESCE(weather_observation.ws, new.ws),
            pa = COALESCE(weather_observation.pa, new.pa),
            ps = COALESCE(weather_observation.ps, new.ps),
            ta = COALESCE(weather_observation.ta, new.ta),
            td = COALESCE(weather_observation.td, new.td),
            hm = COALESCE(weather_observation.hm, new.hm)
    """)

    try:
        with engine.begin() as connection:
            connection.execute(upsert_sql, records)

        print("MySQL UPSERT 적재 완료")
        print(f"대상 테이블: weather_observation")
        print(f"입력 데이터: {len(records)}건")

    finally:
        engine.dispose()

# ============================================================
# 6. 프로그램 실행
# ============================================================

if __name__ == "__main__":
    df = collect_weather()
    df = transform_weather(df)
    quality_check_weather(df)
    save_csv(df)
    load_to_mysql(df)
