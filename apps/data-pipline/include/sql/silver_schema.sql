CREATE SCHEMA IF NOT EXISTS silver;

CREATE TABLE IF NOT EXISTS silver.pipeline_runs (
    run_id BIGSERIAL PRIMARY KEY,
    dag_run_id TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running',
    discovered_objects INTEGER NOT NULL DEFAULT 0,
    processed_objects INTEGER NOT NULL DEFAULT 0,
    valid_rows INTEGER NOT NULL DEFAULT 0,
    quarantined_rows INTEGER NOT NULL DEFAULT 0,
    failed_objects INTEGER NOT NULL DEFAULT 0,
    inserted_rows INTEGER NOT NULL DEFAULT 0,
    updated_rows INTEGER NOT NULL DEFAULT 0,
    unchanged_rows INTEGER NOT NULL DEFAULT 0,
    deduped_rows INTEGER NOT NULL DEFAULT 0,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS silver.ingestion_ledger (
    ledger_id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    object_key TEXT NOT NULL,
    etag TEXT NOT NULL,
    partition_date DATE,
    status TEXT NOT NULL,
    run_id BIGINT REFERENCES silver.pipeline_runs(run_id),
    reason TEXT,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rows_loaded INTEGER NOT NULL DEFAULT 0,
    rows_rejected INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_ingestion_ledger_object UNIQUE (object_key, etag)
);

CREATE INDEX IF NOT EXISTS idx_ingestion_ledger_status_processed
    ON silver.ingestion_ledger(status, processed_at DESC);

CREATE TABLE IF NOT EXISTS silver.rejected_rows (
    rejected_id BIGSERIAL PRIMARY KEY,
    run_id BIGINT REFERENCES silver.pipeline_runs(run_id),
    source TEXT,
    object_key TEXT,
    reasons JSONB NOT NULL,
    payload JSONB,
    rejected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rejected_rows_run
    ON silver.rejected_rows(run_id);

CREATE TABLE IF NOT EXISTS silver.courses (
    course_sk BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    source_course_key TEXT NOT NULL,
    canonical_url TEXT NOT NULL,
    row_hash TEXT NOT NULL,
    title TEXT NOT NULL,
    headline TEXT,
    description TEXT,
    rating NUMERIC(4, 2),
    rating_source TEXT,
    num_reviews INTEGER,
    num_enrolled BIGINT,
    price_normalized NUMERIC(12, 2),
    is_free BOOLEAN,
    instructor_name TEXT,
    instructor_org TEXT,
    image_url TEXT,
    duration_hours NUMERIC(10, 2),
    level_normalized TEXT,
    language_normalized TEXT,
    category TEXT,
    subcategory TEXT,
    has_certificate BOOLEAN,
    engagement_proxy NUMERIC(10, 2),
    completeness_score NUMERIC(5, 4),
    title_length INTEGER,
    description_length INTEGER,
    scraped_at TIMESTAMPTZ,
    bronze_ingested_at TIMESTAMPTZ,
    loaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_silver_courses_identity UNIQUE (source, canonical_url),
    CONSTRAINT ck_silver_courses_rating CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
    CONSTRAINT ck_silver_courses_price CHECK (price_normalized IS NULL OR price_normalized >= 0),
    CONSTRAINT ck_silver_courses_duration CHECK (duration_hours IS NULL OR duration_hours >= 0),
    CONSTRAINT ck_silver_courses_completeness CHECK (
        completeness_score IS NULL OR (completeness_score >= 0 AND completeness_score <= 1)
    )
);

CREATE INDEX IF NOT EXISTS idx_silver_courses_source_category
    ON silver.courses(source, category);

CREATE INDEX IF NOT EXISTS idx_silver_courses_scraped_at
    ON silver.courses(scraped_at DESC);

CREATE INDEX IF NOT EXISTS idx_silver_courses_row_hash
    ON silver.courses(row_hash);

CREATE TABLE IF NOT EXISTS silver.course_skills (
    course_sk BIGINT NOT NULL REFERENCES silver.courses(course_sk) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    PRIMARY KEY (course_sk, skill)
);

CREATE INDEX IF NOT EXISTS idx_course_skills_skill
    ON silver.course_skills(skill);

CREATE TABLE IF NOT EXISTS silver.course_objectives (
    course_sk BIGINT NOT NULL REFERENCES silver.courses(course_sk) ON DELETE CASCADE,
    objective TEXT NOT NULL,
    PRIMARY KEY (course_sk, objective)
);

CREATE INDEX IF NOT EXISTS idx_course_objectives_objective
    ON silver.course_objectives(objective);
