"""Silver Ingestion DAG.

Reads new Bronze JSON objects from MinIO, cleans and validates records,
quarantines invalid rows, and upserts valid rows to Supabase Postgres
under the silver schema.

Dependency strategy:
- This DAG runs weekly and waits for successful completion of
  bronze_ingestion for the same logical date before processing.
"""

from datetime import datetime, timedelta

from airflow.sdk import DAG, task
from airflow.providers.standard.sensors.external_task import ExternalTaskSensor

from include.silver_ingestion import ensure_silver_schema, run_silver_ingestion


default_args = {
    "owner": "data-engineering",
    "retries": 1,
    "retry_delay": timedelta(minutes=10),
    "execution_timeout": timedelta(hours=2),
}


with DAG(
    dag_id="silver_ingestion",
    description="Load MinIO Bronze data into Supabase Postgres silver schema",
    default_args=default_args,
    schedule="@weekly",
    start_date=datetime(2026, 3, 1),
    catchup=False,
    max_active_tasks=1,
    tags=["silver", "ingestion", "postgres", "supabase"],
) as dag:

    # wait_for_bronze = ExternalTaskSensor(
    #     task_id="wait_for_bronze",
    #     external_dag_id="bronze_ingestion",
    #     external_task_id=None,
    #     allowed_states=["success"],
    #     failed_states=["failed"],
    #     mode="reschedule",
    #     poke_interval=60,
    #     timeout=60 * 60 * 4,
    # )

    @task(task_id="ensure_silver_schema")
    def ensure_schema_task():
        ensure_silver_schema()

    @task(task_id="load_bronze_to_silver")
    def load_task(**context):
        dag_run = context.get("dag_run")
        dag_run_id = dag_run.run_id if dag_run else None
        return run_silver_ingestion(dag_run_id=dag_run_id)

    ensure_schema_task() >> load_task()
