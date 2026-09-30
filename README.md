# KMA Weather Data Pipeline

기상청 ASOS API를 활용한 기상 데이터 수집·품질검증·MySQL 적재 및 ETL 자동화 프로젝트

> 현재 개발 진행 중인 프로젝트입니다.

---

## 📌 프로젝트 소개

기상청 API Hub에서 서울 지역의 시간별 기상 데이터를 수집하고,
Python을 이용해 데이터를 전처리 및 검증한 후 MySQL에 적재하는
데이터 파이프라인을 구축하고 있습니다.

이후 Airflow를 활용한 ETL 자동화와 FastAPI 및 Dashboard를 추가하여
데이터 수집부터 활용까지 연결되는 데이터 엔지니어링 프로젝트로 확장할 예정입니다.

---

## 🎯 프로젝트 목표

- 외부 API를 활용한 데이터 수집
- Python 기반 ETL 구현
- 데이터 품질검증(Data Quality) 구현
- MySQL 데이터베이스 적재
- Airflow를 활용한 ETL 자동화
- API 및 Dashboard를 통한 데이터 활용
- Docker 기반 실행 환경 구성

---

## 🏗️ 현재 구현 구조

```text
기상청 KMA ASOS API
        ↓
Python 데이터 수집
        ↓
데이터 전처리
        ↓
Data Quality Check
 ├─ 결측값 검사
 ├─ 중복 데이터 검사
 ├─ 시간 순서 검사
 ├─ 1시간 간격 검사
 └─ 값의 허용 범위 검사
        ↓
CSV 저장
        ↓
MySQL 적재
```

---

## 🔧 기술 스택

| 분야 | 기술 |
|---|---|
| Language | Python |
| Data Processing | Pandas |
| API | KMA API Hub |
| Database | MySQL |
| DB Connection | SQLAlchemy, PyMySQL |
| Environment | Anaconda |
| Workflow | Apache Airflow |
| Container | Docker |
| API | FastAPI 예정 |
| Dashboard | 예정 |

---

## 📊 데이터

### 데이터 출처

기상청 API Hub의 ASOS 시간별 관측 데이터를 활용합니다.

- 관측 지점: 서울(108)
- 데이터 주기: 1시간
- 현재 수집 단위: 하루 단위

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

---

## 🔍 Data Quality Check

수집된 데이터를 MySQL에 적재하기 전에 기본적인 데이터 품질검증을 수행합니다.

### 1. 결측값 검사

데이터 내 결측값의 개수를 확인합니다.

```text
결측값: 0건
```

### 2. 중복 데이터 검사

`TM + STN`을 기준으로 중복 데이터를 검사합니다.

```text
중복 데이터: 0건
```

### 3. 시간 순서 검사

관측 시간이 올바른 순서로 정렬되어 있는지 확인합니다.

```text
시간 순서 오류: False
```

### 4. 시간 간격 검사

시간별 데이터가 1시간 간격으로 연속되는지 검사합니다.

```text
1시간 간격 오류: False
```

### 5. 값의 허용 범위 검사

주요 기상 데이터의 비정상적인 값을 확인합니다.

```text
WD : 0 ~ 360
WS : 0 이상
HM : 0 ~ 100
TA : -50 ~ 60℃
```

### 현재 검증 결과

```text
===== DATA QUALITY CHECK =====
전체 데이터: 24건
결측값: 0건
중복 데이터: 0건
시간 순서 오류: False
1시간 간격 오류: False
범위 오류: {}
품질검증 결과: PASS
```

---

## 🗄️ MySQL 적재

MySQL의 `weather_observation` 테이블에 데이터를 적재합니다.

동일한 `TM + STN` 데이터가 다시 들어오는 경우
중복 적재를 방지하도록 구성했습니다.

```text
KMA API
   ↓
Python ETL
   ↓
Data Quality Check
   ↓
MySQL
```

---

## ⚙️ Airflow ETL 자동화

현재 Airflow를 Docker 환경에서 구성하여 ETL 파이프라인을 자동화하고 있습니다.

DAG 구조:

```text
collect_weather
       ↓
quality_check
       ↓
load_mysql
```

Airflow를 통해 정해진 시간에 기상 데이터를 수집하고
품질검증 후 MySQL에 적재하는 과정을 자동화하는 것을 목표로 합니다.

---

## 🖥️ 실행 화면

### 1. Python ETL 및 Data Quality Check

<!-- 여기에 터미널 실행 결과 이미지를 업로드하세요. -->
<!-- 권장 파일명: images/etl-result.png -->

![Python ETL 실행 결과](images/etl-result.png)

### 2. Airflow ETL 실행

<!-- 여기에 Airflow DAG 실행 화면 이미지를 업로드하세요. -->
<!-- 권장 파일명: images/airflow-dag.png -->

![Airflow DAG](images/airflow-dag.png)

### 3. MySQL 데이터 적재 결과

<!-- 여기에 MySQL 조회 화면 이미지를 업로드하세요. -->
<!-- 권장 파일명: images/mysql-data.png -->

![MySQL 데이터](images/mysql-data.png)

---

## 📈 개발 진행 상황

- [x] KMA API 연동
- [x] 기상 데이터 수집
- [x] 데이터 전처리
- [x] 결측값 검사
- [x] 중복 데이터 검사
- [x] 시간 순서 검사
- [x] 1시간 간격 검사
- [x] 값 범위 검사
- [x] MySQL 적재
- [x] Airflow 환경 구성
- [x] Airflow ETL DAG 구성
- [ ] FastAPI 데이터 조회 API
- [ ] Dashboard 구축
- [ ] Docker Compose 기반 전체 환경 정리
- [ ] 프로젝트 문서화 및 운영 구조 개선

---

## 💡 프로젝트를 통해 학습한 내용

- 외부 API 데이터 수집 및 처리
- ETL 파이프라인 구성
- 데이터 품질검증의 필요성
- 관계형 데이터베이스 적재
- 중복 데이터 처리
- 시계열 데이터의 연속성 검증
- Airflow DAG 구성
- Docker 기반 개발환경 구성

---

## 📁 프로젝트 구조

```text
kma-weather-data-pipeline/
│
├── 01_api_test.py
├── 02_collect_weather.py
├── dags/
│   └── weather_etl_dag.py
│
├── README.md
└── .env
```

> `.env`에는 API Key 및 데이터베이스 접속 정보가 포함되어 있으므로 GitHub에 업로드하지 않습니다.
