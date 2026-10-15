import pendulum

from airflow import DAG
from airflow.operators.bash import BashOperator


with DAG(
    dag_id="weather_etl",
    start_date=pendulum.datetime(2026, 9, 17, tz="Asia/Seoul"),
    schedule="0 1 * * *",
    catchup=False,
) as dag:

    collect_weather = BashOperator(
        task_id="collect_weather",
        bash_command=(
            "python -c "
            "\"import sys; "
            "sys.path.insert(0, '/opt/weather'); "
            "from importlib.machinery import SourceFileLoader; "
            "m = SourceFileLoader('weather', '/opt/weather/02_collect_weather.py').load_module(); "
            "df = m.collect_weather(); "
            "df = m.transform_weather(df); "
            "m.save_csv(df)\""
        ),
    )

    quality_check = BashOperator(
        task_id="quality_check",
        bash_command=(
            "python -c "
            "\"import sys; "
            "sys.path.insert(0, '/opt/weather'); "
            "import pandas as pd; "
            "from importlib.machinery import SourceFileLoader; "
            "m = SourceFileLoader('weather', '/opt/weather/02_collect_weather.py').load_module(); "
            "df = pd.read_csv('/opt/weather/weather_data.csv'); "
            "df['TM'] = pd.to_datetime(df['TM']); "
            "m.quality_check_weather(df)\""
        ),
    )

    load_mysql = BashOperator(
        task_id="load_mysql",
        bash_command=(
            "python -c "
            "\"import sys; "
            "sys.path.insert(0, '/opt/weather'); "
            "import pandas as pd; "
            "from importlib.machinery import SourceFileLoader; "
            "m = SourceFileLoader('weather', '/opt/weather/02_collect_weather.py').load_module(); "
            "df = pd.read_csv('/opt/weather/weather_data.csv'); "
            "df['TM'] = pd.to_datetime(df['TM']); "
            "m.load_to_mysql(df)\""
        ),
    )

    collect_weather >> quality_check >> load_mysql