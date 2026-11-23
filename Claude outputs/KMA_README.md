# KMA Weather Data Pipeline

기상청 ASOS API에서 전국 관측소의 시간별 기상 데이터를 수집하고, 품질검증을 거쳐 MySQL에 적재한 뒤,
FastAPI와 React 대시보드로 조회하는 데이터 엔지니어링 프로젝트입니다.
수집·검증·적재는 Apache Airflow DAG로 매일 자동 실행됩니다.

---

## 📌 한눈에 보기

- **수집**: 기상청 API Hub ASOS 시간자료를 하루 단위로 수집 (`stn=0`, 전체 관측소 한 번에 요청)
- **검증**: 필수 오류는 파이프라인 중단, 측정값 결측·시간 간격 이상은 경고로 기록하고 통과
- **적재**: MySQL `weather_observation`에 UPSERT (기존 유효값은 보존, NULL만 보완)
- **자동화**: Airflow DAG `weather_etl` — 매일 01:00(Asia/Seoul) 실행
- **조회**: FastAPI (`/api/weather`, `/api/quality`, `/api/pipeline/runs`) + React/TypeScript 대시보드

---

## 🏗️ 데이터 파이프라인 구조

```text
기상청 KMA ASOS API (kma_sfctm3.php)
        ↓
collect_weather      수집 (실패 시 최대 3회 재시도) → 전처리(transform) → CSV 저장
        ↓
quality_check        품질검증 (중단 조건 / 경고 조건 구분)
        ↓
load_mysql           MySQL weather_observation UPSERT
        ↓
FastAPI              /api/weather · /api/quality · /api/pipeline/runs
        ↓
React Dashboard      Dashboard · Weather · Quality · Pipeline 페이지
```

### Airflow DAG (`dags/weather_etl_dag.py`)

```text
dag_id   : weather_etl
schedule : 0 1 * * *  (매일 01:00, Asia/Seoul)
catchup  : False

collect_weather  >>  quality_check  >>  load_mysql
```

각 태스크는 `BashOperator`로 `02_collect_weather.py`의 함수를 불러 실행합니다.

- `collect_weather`: 전날 하루치 수집 → 전처리 → `weather_data.csv` 저장
- `quality_check`: CSV를 읽어 `quality_check_weather()` 실행
- `load_mysql`: CSV를 읽어 `load_to_mysql()` 실행

과거 기간이 필요하면 `backfill_weather(start_date, end_date)`로 날짜 범위를 채울 수 있습니다.

---

## 🔍 Data Quality Check

DAG의 `quality_check`는 아래 기준으로 **중단(실패)** 과 **경고 후 통과**를 구분합니다.
측정값 결측은 실제 관측 장비 특성상 발생할 수 있어, 전체 적재를 막지 않고 경고로 남깁니다.

| 검사 | 항목 | 결과 |
|---|---|---|
| 데이터 건수 | 데이터가 0건 | ❌ 중단 |
| 필수 컬럼 | TM, STN, WD, WS, PA, PS, TA, TD, HM 중 누락 | ❌ 중단 |
| 키 결측 | TM 또는 STN 결측 | ❌ 중단 |
| 중복 | `TM + STN` 중복 | ❌ 중단 |
| 값 범위 | WD 0~360, WS ≥ 0, HM 0~100, TA -50~60℃ 벗어남 | ❌ 중단 |
| 측정값 결측 | WD, WS, PA, PS, TA, TD, HM의 NaN | ⚠️ 경고 후 통과 |
| 시간 순서 | 지점별 시간 정렬 이상 | ⚠️ 경고 기록 |
| 시간 간격 | 지점별 1시간 간격 불연속 | ⚠️ 경고 기록 |

실행 로그 예시:

```text
===== DATA QUALITY CHECK =====
전체 데이터: 24건
전체 결측값: 0건
중복 데이터: 0건
시간 순서 오류: False
1시간 간격 오류: False
범위 오류: {}
품질검증 결과: PASS
```

---

## 🗄️ MySQL 적재 (UPSERT)

`weather_observation` 테이블에 `INSERT ... ON DUPLICATE KEY UPDATE`로 적재합니다.
같은 `TM + STN` 데이터가 다시 들어오면 **기존에 값이 있는 컬럼은 유지하고, NULL이던 컬럼만 새 값으로 채웁니다.**

```sql
INSERT INTO weather_observation (tm, stn, wd, ws, pa, ps, ta, td, hm)
VALUES (:tm, :stn, :wd, :ws, :pa, :ps, :ta, :td, :hm) AS new
ON DUPLICATE KEY UPDATE
    wd = COALESCE(weather_observation.wd, new.wd),
    ...
    hm = COALESCE(weather_observation.hm, new.hm)
```

재실행하거나 backfill을 다시 돌려도 중복 행이 생기지 않고(멱등), 이전에 결측이던 값이 나중 수집에서 채워질 수 있습니다.

---

## 🌐 FastAPI (`api/main.py`)

| Endpoint | 설명 |
|---|---|
| `GET /` | 서버 동작 확인 |
| `GET /api/test-db` | MySQL 연결 확인 |
| `GET /api/weather` | 관측소(`stn`, 필수)·날짜(`date`) 또는 기간(`start`, `end`)으로 기상 데이터 조회 |
| `GET /api/quality` | 날짜(`date`, 필수)별 품질검증 결과 |
| `GET /api/pipeline/runs` | Airflow REST API로 `weather_etl` 최근 5회 실행 상태 조회 |

- 관측소 번호는 코드에 내장된 공식 관측소 목록(`OFFICIAL_STATIONS`)으로 검증합니다.
- `/api/pipeline/runs`는 Airflow 토큰을 캐시(약 50분)하고, 401이면 토큰을 갱신해 한 번 재시도합니다.

---

## 🖥️ Dashboard (`frontend/`)

React + TypeScript(Vite)로 만든 대시보드입니다. FastAPI에서 데이터를 받아 보여줍니다.

- **Dashboard**: 전체 요약
- **Weather**: 관측소·날짜별 기상 데이터 조회
- **Quality**: 날짜별 품질검증 결과
- **Pipeline**: Airflow DAG 최근 실행 상태

---

## 🐳 Docker

- `docker-compose.yaml`: Airflow(apiserver, scheduler, dag-processor, worker, triggerer) + PostgreSQL + Redis 실행 환경
- `Dockerfile`: ETL 스크립트(`02_collect_weather.py`)를 단독 실행하는 이미지

> MySQL, FastAPI, React 대시보드는 아직 Docker Compose에 포함되어 있지 않고 로컬에서 따로 실행합니다. (아래 "알려진 한계" 참고)

---

## 🔧 기술 스택

| 분야 | 기술 |
|---|---|
| Language | Python, TypeScript |
| Data Processing | Pandas |
| Data Source | 기상청 API Hub (ASOS 시간자료) |
| Database | MySQL (적재), PostgreSQL·Redis (Airflow 메타데이터/브로커) |
| DB Connection | SQLAlchemy, PyMySQL |
| Workflow | Apache Airflow 3.x |
| Container | Docker, Docker Compose |
| Backend API | FastAPI, Uvicorn |
| Frontend | React, TypeScript, Vite |

---

## 📊 데이터

### 주요 컬럼

| 컬럼 | 설명 |
|---|---|
| TM | 관측 시각 |
| STN | 관측소 번호 |
| WD | 풍향 |
| WS | 풍속 |
| PA | 현지기압 |
| PS | 해면기압 |
| TA | 기온 |
| TD | 이슬점온도 |
| HM | 상대습도 |

- 데이터 주기: 1시간
- 수집 단위: 하루 (전체 관측소 한 번에 요청)

---

## ⚠️ 알려진 한계 / 개선 예정

- 대시보드의 품질 리포트(`get_quality_report`)는 측정값 결측이 1건이라도 있으면 `FAIL`로 표시합니다. DAG의 품질검증은 결측을 경고로 통과시키므로 **두 기준이 다릅니다.** (대시보드 표시 기준을 DAG와 맞출 예정)
- 수집 이력(성공/실패, 건수)을 따로 저장하는 테이블이 없어, 실행 상태는 Airflow API로만 확인합니다.
- MySQL·FastAPI·React는 Docker Compose에 통합되어 있지 않습니다.
- 환경 구성 가이드(`weather_pipeline_startup_guide.md`)는 로컬 개발 환경 기준이라 경로·설정을 본인 환경에 맞게 수정해야 합니다.

---

## 📁 프로젝트 구조

```text
kma-weather-data-pipeline/
├── api/
│   └── main.py                     # FastAPI
├── dags/
│   └── weather_etl_dag.py          # Airflow DAG
├── frontend/                       # React + TypeScript 대시보드
│   └── src/components/             # Dashboard, Weather, Quality, Pipeline ...
├── images/                         # README 스크린샷
├── 01_api_test.py                  # API 호출 테스트
├── 02_collect_weather.py           # 수집·전처리·품질검증·CSV·MySQL 적재
├── docker-compose.yaml             # Airflow 실행 환경
├── Dockerfile                      # ETL 단독 실행 이미지
├── requirements.txt
├── weather_pipeline_startup_guide.md
└── README.md
```

---

## 🖼️ 실행 화면

![Python ETL 실행 결과](images/etl-result.png)
![Airflow DAG](images/airflow-dag.png)
![MySQL 데이터](images/mysql-data.png)

---

## 🔐 환경변수

`.env`에 API 및 MySQL 접속 정보를 설정합니다. (GitHub에 올리지 않습니다.)

```text
KMA_AUTH_KEY=YOUR_API_KEY

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=YOUR_PASSWORD
MYSQL_DATABASE=weather_db
```

---

## 💡 프로젝트를 통해 배운 점

- 외부 API 수집과 재시도 처리
- "중단할 오류"와 "경고로 남길 이상"을 구분하는 품질검증 정책 설계
- COALESCE 기반 UPSERT로 재실행해도 안전한(멱등) 적재
- Airflow DAG 구성과 Docker Compose 실행 환경
- 파이프라인 → API → 대시보드까지 이어지는 데이터 흐름 구성
