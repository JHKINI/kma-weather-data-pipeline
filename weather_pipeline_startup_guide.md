# 기상청 데이터 파이프라인 실행 가이드

프로젝트를 껐다 켰을 때 필요한 실행 순서입니다.

## 1. 무엇을 켜야 하나요?

  -----------------------------------------------------------------------
  항목                                언제 필요한가요?
  ----------------------------------- -----------------------------------
  MySQL 서버                          API 조회 또는 ETL 적재를 할 때

  FastAPI / Uvicorn                   백엔드 API를 사용할 때

  React / Vite                        브라우저 대시보드를 볼 때

  Docker Desktop                      Docker 컨테이너를 실행할 때

  Airflow                             ETL 자동 실행 일정이나 DAG를 확인할
                                      때

  Docker ETL 이미지                   Airflow와 별개로 ETL을 컨테이너에서
                                      직접 한 번 실행할 때
  -----------------------------------------------------------------------

**대시보드만 볼 때는 MySQL + Uvicorn + 프론트엔드가 기본입니다.**
Airflow 자동 실행을 확인하려면 Docker Desktop과 Airflow 컨테이너도
실행되어야 합니다. Docker Desktop은 Airflow보다 먼저 켭니다.

## 2. 기본 실행 순서

### ① MySQL 서버 확인

MySQL 서버가 실행 중이면 다시 시작할 필요가 없습니다. MySQL Workbench는
관리 도구이므로, Workbench만 열었다고 서버까지 실행된 것은 아닐 수
있습니다.

Windows에서 MySQL 서비스로 설치했다면 시작 메뉴에서 **서비스**를
검색하고, MySQL 서비스(예: `MySQL80`)가 실행 중인지 확인합니다.

### ② FastAPI / Uvicorn 실행

PowerShell 터미널 1:

``` powershell
cd C:\Users\AISW_203_115\Desktop\weather-data-pipeline
conda activate weather
python -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
```

정상 실행 후 Swagger 문서: http://127.0.0.1:8000/docs

이 명령은 `api/main.py` 안에 `app = FastAPI()`가 있다는 전제입니다.
`Could not import module` 오류가 나면 프로젝트 폴더 위치와 `api/main.py`
존재 여부를 확인하세요.

### ③ React / Vite 프론트엔드 실행

PowerShell 터미널 2를 새로 열고:

``` powershell
cd C:\Users\AISW_203_115\Desktop\weather-data-pipeline\frontend
npm run dev
```

터미널에 표시되는 Local 주소(보통 `http://localhost:5173`)를
브라우저에서 엽니다. 프론트엔드와 Uvicorn은 별도 터미널에서 실행해
둡니다. `package.json`이 없다고 나오면 실제 프론트엔드 폴더 위치를
확인하세요.

### ④ 화면 확인

1.  MySQL 서버 실행 여부 확인
2.  Uvicorn 터미널 오류 확인
3.  Vite 터미널에 표시된 주소로 대시보드 접속
4.  데이터와 그래프가 표시되는지 확인

현재 React 화면은 **품질 검증 결과 API 연동 오류가 남아 있을 수
있습니다.** 대시보드가 열리는 것과 품질 결과까지 정상 연동되는 것은
별개입니다.

## 3. Airflow 자동 실행도 확인할 때

Airflow는 매일 ETL을 실행하는 DAG를 확인하거나 수동 실행할 때
필요합니다. 대시보드만 볼 때 매번 Airflow를 시작할 필요는 없습니다.

Docker Desktop을 먼저 실행한 뒤 PowerShell에서:

``` powershell
cd C:\Users\AISW_203_115\Desktop\airflow
docker compose up -d
docker compose ps
```

컨테이너가 정상 상태인지 확인하고, 현재 `docker-compose.yaml`에 설정된
주소와 포트로 Airflow 웹 UI를 엽니다.

DAG `weather_etl`의 작업 순서:

``` text
collect_weather → quality_check → load_mysql
```

-   `collect_weather`: 기상 데이터 수집·변환 및 CSV 저장
-   `quality_check`: CSV를 읽어 품질 규칙 실행
-   `load_mysql`: CSV 데이터를 MySQL에 적재

현재 DAG는 Airflow 컨테이너의 `BashOperator`가 `/opt/weather`로 마운트된
프로젝트 코드를 호출하는 구조입니다. 별도로 만든 `weather-etl:1.0`
이미지를 DAG가 직접 실행하는 구조와는 다릅니다.

Airflow 컨테이너가 이미 실행 중이라면 매번 새로 만들 필요가 없습니다.
`docker compose ps`로 상태를 확인하세요.

## 4. Docker ETL을 직접 실행할 때만

이 작업은 Airflow DAG 실행과 별개입니다. 수동으로 컨테이너 ETL을 한 번
실행할 때만 사용합니다.

Docker Desktop 실행 중, 프로젝트 루트에 `.env`가 있고 `weather-etl:1.0`
이미지가 빌드되어 있다면:

``` powershell
cd C:\Users\AISW_203_115\Desktop\weather-data-pipeline
docker run --rm --env-file .env weather-etl:1.0
```

컨테이너에서 ETL을 한 번 실행하고 종료합니다. `--rm`은 종료 후
컨테이너를 자동 삭제하지만 이미지는 삭제하지 않습니다.

`.env`의 `MYSQL_HOST`는 실행 환경에 맞아야 합니다.
`host.docker.internal`은 Docker 컨테이너에서 Windows 호스트의 MySQL에
접근할 때 쓰는 설정입니다. Windows에서 Uvicorn을 직접 실행할 때는 현재
코드가 해당 값을 `localhost`로 변환하도록 수정되어 있습니다.

## 5. requirements.txt 확인

현재 목록:

``` text
requests
pandas
python-dotenv
SQLAlchemy
PyMySQL
```

이 목록은 API 요청, 데이터 처리, 환경변수 로딩, SQLAlchemy 및 MySQL
연결에 필요한 패키지입니다.

FastAPI 코드가 `fastapi`와 `uvicorn`을 사용하고 있는데 목록에 없다면
아래 두 항목도 추가하는 것이 좋습니다.

``` text
fastapi
uvicorn[standard]
```

그다음 `weather` 환경에서 설치합니다.

``` powershell
python -m pip install -r requirements.txt
```

React 프론트엔드는 Python requirements가 아니라
`frontend/package.json`과 npm으로 관리합니다.

## 6. 종료 방법

-   Uvicorn 터미널: `Ctrl + C`
-   Vite 터미널: `Ctrl + C`
-   Airflow를 중지하려면 Airflow 폴더에서:

``` powershell
docker compose down
```

`docker compose down`은 Airflow 컨테이너를 중지하고 제거합니다. 단순히
터미널 탭을 닫는 것과 컨테이너를 중지하는 것은 다릅니다.

## 7. 빠른 체크리스트

-   [ ] MySQL 서버 실행 중
-   [ ] `weather` 가상환경 활성화
-   [ ] Uvicorn 실행: `http://127.0.0.1:8000/docs`
-   [ ] 프론트엔드 실행: Vite 터미널에 표시된 주소
-   [ ] Airflow가 필요하면 Docker Desktop 및 Airflow 컨테이너 상태 확인
-   [ ] ETL을 직접 실행할 때만
    `docker run --rm --env-file .env weather-etl:1.0`
-   [ ] `.env`, API 키, DB 비밀번호를 GitHub에 올리지 않기
