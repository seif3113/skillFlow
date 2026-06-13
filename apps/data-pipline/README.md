# Educational Data Engineering Pipeline 🎓

A comprehensive **data engineering graduation project** that aggregates educational content from major learning platforms using modern data architecture patterns. This project implements a **medallion lakehouse architecture** with automated scraping, orchestration, and cloud-native storage.

## 🌟 Project Overview

This system collects, processes, and stores educational course data from **5 major platforms** to create a unified dataset for analytics, machine learning, and educational research. The project demonstrates modern data engineering practices including:

- **Multi-platform web scraping** with anti-detection measures
- **Apache Airflow orchestration** for reliable pipeline execution
- **MinIO object storage** implementing bronze data layer patterns
- **Containerized deployment** with Docker and Astronomer
- **Unified data schema** enabling cross-platform analytics

### Supported Platforms

| Platform         | Content Type          | Method              | Categories Scraped                                                        |
| ---------------- | --------------------- | ------------------- | ------------------------------------------------------------------------- |
| **Udemy**        | Video Courses         | Selenium Scraping   | Development, Business, IT & Software, Design, Marketing                   |
| **Coursera**     | University Courses    | Selenium Scraping   | Data Science, Computer Science, Business, Information Technology          |
| **W3Schools**    | Programming Tutorials | Selenium Scraping   | Python, JavaScript, SQL, Java, HTML, CSS, React, Node.js, TypeScript, C++ |
| **Khan Academy** | Educational Lessons   | Selenium Scraping   | Math, Science, Computing, Economics & Finance                             |
| **YouTube**      | Educational Videos    | YouTube Data API v3 | Python, Data Science, Machine Learning, Web Development, SQL, DevOps      |

---

## 🏗️ Architecture & Technology Stack

### **Data Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐
│   Web Platforms │───▶│  Airflow DAGs    │───▶│   MinIO Bronze  │───▶│ Supabase Postgres Silver│
│                 │    │                  │    │     Layer       │    │                         │
│ • Udemy         │    │ • Scraping Tasks │    │                 │    │ • Type 1 Upsert         │
│ • Coursera      │    │ • Error Handling │    │ Hive Partitioning│   │ • Dedup + Row Hash      │
│ • W3Schools     │    │ • Retry Logic    │    │ /year/month/day │    │ • Rejected Rows Queue   │
│ • Khan Academy  │    │ • Parallel Exec  │    │                 │    │ • Skills/Objectives Child│
│ • YouTube       │    │                  │    │ JSON Objects    │    │   Tables                │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └─────────────────────────┘
```

### **Technology Stack**

**🔧 Core Infrastructure:**

- **Apache Airflow** (Astronomer Runtime 3.1-13) - Workflow orchestration
- **MinIO** - S3-compatible object storage for bronze layer
- **Docker** - Containerization and deployment
- **Selenium + undetected-chromedriver** - Web scraping with anti-detection
- **YouTube Data API v3** - Official API integration

**⚙️ Data Processing:**

- **Python 3.11** - Primary language
- **Pandas** - Data manipulation and CSV export
- **boto3** - AWS S3/MinIO integration
- **BeautifulSoup4** - HTML parsing
- **Threading** - Parallel scraper execution

**🛡️ Anti-Detection & Reliability:**

- **undetected-chromedriver** - Bypass bot detection
- **Proxy rotation** - Rate limiting avoidance
- **Xvfb virtual display** - Headless browser operation
- **Random delays** - Human-like browsing patterns
- **Robust error handling** - Graceful failure recovery

---

## 🚀 Quick Start

### Prerequisites

- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **Git**
- **YouTube Data API key** (optional, for YouTube scraping)

### 1. Clone Repository

```bash
git clone <repository-url>
cd "Graduation Project"
```

### 2. Environment Setup

Create `.env` file for YouTube API (optional):

```bash
echo "YOUTUBE_API_KEY=your_youtube_api_key_here" > .env
```

### 3. Start Services

```bash
# Start Airflow + MinIO
astro dev start

# Alternative: Direct Docker Compose
docker-compose up -d
```

### 4. Access Interfaces

- **Airflow UI:** http://localhost:8080 (admin/admin)
- **MinIO Console:** http://localhost:9001 (minioadmin/minioadmin)

### 5. Run Pipeline

```bash
# Trigger bronze ingestion DAG
astro dev run dags trigger bronze_ingestion

# Or via Airflow UI: Enable and trigger "bronze_ingestion" DAG
```

---

## 📊 Data Pipeline Details

### **Bronze Ingestion DAG** (`dags/bronze_ingestion_dag.py`)

**Schedule:** Weekly on Sunday at 02:00 UTC
**Execution:** Parallel tasks (max 2 concurrent)
**Runtime:** ~2 hours for full execution

#### Key Features:

- **30+ individual scraping tasks** (5 platforms × multiple categories)
- **Automatic error recovery** with retries and timeouts
- **Anti-detection measures** with shared virtual display
- **Idempotent uploads** - prevents duplicate data
- **Hive-style partitioning** for efficient data organization

#### Task Structure:

```python
# Example task generation
for category in ["development", "business", "it-and-software"]:
    @task(task_id=f"udemy_{category}")
    def scrape_task():
        return scrape_udemy(category=category, max_pages=3)
```

### **Data Flow Architecture**

```
Scraper → Course Objects → JSON Serialization → MinIO Upload
   ↓           ↓              ↓                    ↓
Platform    Unified        Metadata           Bronze Layer
Specific    Schema         Enhancement        Partitioning
```

### **Silver Ingestion DAG** (`dags/silver_ingestion_dag.py`)

**Schedule:** Weekly (`@weekly`). Designed to run after the corresponding `bronze_ingestion` run; the ExternalTaskSensor wiring exists but is currently disabled in the DAG while we harden both layers, so for now you trigger Silver after Bronze has finished.

#### What the Silver step does today

- **Bootstrap silver schema** via `ensure_silver_schema()` which executes [include/sql/silver_schema.sql](include/sql/silver_schema.sql) idempotently.
- **Scan MinIO Bronze** via S3 API, skipping already-processed objects using `silver.ingestion_ledger` on `(object_key, etag)`.
- **Clean + validate records** with strict rules on `source`, `title`, `canonical_url`, rating ranges, and basic type coercion for numeric fields.
- **Normalize core attributes** (levels, language, price, duration, enrolment counts, skills/objectives lists).
- **Engineer quality signals** including `completeness_score`, `engagement_proxy`, and text length features.
- **Type 1 upsert** into Supabase Postgres on `(source, canonical_url)` with `row_hash`-based change detection, only updating changed rows.
- **Refresh child tables** `silver.course_skills` and `silver.course_objectives` whenever a course changes.
- **Quarantine bad data** into `silver.rejected_rows` while still allowing the DAG to succeed.
- **Optionally archive processed JSON** to a `processed/` prefix in MinIO (controlled by `SILVER_ARCHIVE_PROCESSED`).

#### Silver schema objects (Supabase Postgres)

- `silver.pipeline_runs` – one row per DAG execution, capturing run status and high-level metrics (discovered/processed/inserted/updated/quarantined, etc.).
- `silver.ingestion_ledger` – object-level ledger keyed by `(object_key, etag)` to enforce idempotency and track status (`loaded`, `quarantined`, `failed`).
- `silver.rejected_rows` – JSONB payloads and reasons for records that failed validation, partitioned by `run_id` for easy inspection.
- `silver.courses` – primary analytical table with normalized fields, uniqueness constraint on `(source, canonical_url)`, and business checks on rating, price, duration, and completeness.
- `silver.course_skills` – exploded view of skills per course (`course_sk`, `skill`).
- `silver.course_objectives` – exploded view of learning objectives per course (`course_sk`, `objective`).

#### Silver run sequence (current)

1. `ensure_silver_schema` – run-once/idempotent bootstrap of all `silver.*` tables and indexes.
2. `load_bronze_to_silver` –
   - discovers new Bronze JSON objects,
   - cleans and validates them,
   - upserts into `silver.courses` + child tables,
   - updates `silver.ingestion_ledger` and `silver.pipeline_runs`,
   - optionally archives successfully loaded objects under `processed/`.

---

## 🗂️ Project Structure

```
Graduation Project/
├── 📁 dags/                          # Airflow DAG definitions
│   └── bronze_ingestion_dag.py       # Main scraping pipeline
├── 📁 include/                       # Airflow task functions
│   └── bronze_ingestion.py           # MinIO upload logic
├── 📁 scrape/                        # Scraping system
│   ├── 📁 shared/                    # Common utilities
│   │   ├── browser_factory.py        # Chrome driver setup
│   │   ├── proxy_manager.py          # Proxy rotation
│   │   ├── config.py                 # Global settings
│   │   └── exporter.py               # CSV streaming
│   ├── 📁 udemy/                     # Udemy scraper
│   │   ├── scraper.py                # Core scraping logic
│   │   ├── exporter.py               # Data export
│   │   └── config.py                 # Platform config
│   ├── 📁 coursera/                  # Coursera scraper
│   ├── 📁 w3schools/                 # W3Schools scraper
│   ├── 📁 khan_academy/              # Khan Academy scraper
│   ├── 📁 youtube/                   # YouTube scraper
│   ├── 📁 scrape_output/             # Development CSV outputs
│   └── run.py                        # Standalone scraper runner
├── 📁 tests/                         # Unit tests
├── docker-compose.override.yml       # MinIO service definition
├── requirements.txt                  # Python dependencies
├── packages.txt                      # System packages
├── Dockerfile                        # Astro runtime customization
└── airflow_settings.yaml            # Airflow connections template
```

---

## 🔧 Key Functions & Components

### **1. Bronze Layer Upload** (`include/bronze_ingestion.py:50-100`)

```python
def upload_course_to_bronze(course_dict, source):
    """
    Uploads course as JSON to MinIO with:
    - UUID5 deterministic IDs (deduplication)
    - Hive partitioning: source/year=YYYY/month=MM/day=DD/
    - Metadata enhancement (_bronze_id, _ingested_at)
    - Idempotent uploads (skip existing files)
    """
```

### **2. Unified Scraper Runner** (`scrape/run.py:45-98`)

```python
def _run_udemy(args, results):
    """
    Threaded Udemy scraper with:
    - Streaming CSV export for real-time output
    - Anti-detection measures (undetected-chromedriver)
    - Proxy rotation and error handling
    - Progress tracking and logging
    """
```

### **3. Browser Factory** (`scrape/shared/browser_factory.py`)

```python
def create_chrome_driver(headless=True, proxy=None, user_agent=None):
    """
    Creates undetected Chrome driver with:
    - Randomized user agents
    - Disabled automation indicators
    - Custom Chrome arguments for stealth
    - Proxy integration and anti-detection
    """
```

### **4. Streaming CSV Exporter** (`scrape/shared/exporter.py`)

```python
class StreamingCSVExporter:
    """
    Real-time CSV export with:
    - Immediate file writing (no memory buffering)
    - Automatic column detection and ordering
    - Progress tracking (course count)
    - Context manager support for safe file handling
    """
```

### **5. Proxy Manager** (`scrape/shared/proxy_manager.py`)

```python
class ProxyManager:
    """
    Handles proxy rotation with:
    - Free proxy list integration
    - Custom proxy file support
    - Health checking and automatic rotation
    - Rate limiting avoidance
    """
```

---

## 📝 Data Schema & Output

### **Unified Course Schema** (30+ Fields)

All platforms are transformed to this common structure:

#### Core Fields (All Platforms):

```python
{
    "id": "uuid5-based-identifier",           # Deterministic UUID based on URL
    "title": "Complete Python Masterclass",   # Course name
    "url": "https://platform.com/course",     # Direct course URL
    "headline": "Learn Python programming",   # Brief summary/tagline
    "description": "Full course description", # Detailed content description
    "rating": 4.5,                           # Average rating (float)
    "num_reviews": 1250,                     # Number of reviews (int)
    "price": "$49.99",                       # Price (string, includes currency)
    "is_free": false,                        # Free vs paid (boolean)
    "instructor_name": "John Doe",           # Primary instructor name
    "level": "Intermediate",                 # Beginner/Intermediate/Advanced
    "language": "English",                   # Course language
    "has_certificate": true,                 # Certificate available (boolean)
    "category": "development",               # Platform category
    "subcategory": "web-development",        # Platform subcategory
    "source": "udemy",                       # Source platform identifier
    "scraped_at": "2026-03-18T10:30:00Z",  # ISO timestamp
    "skills": ["Python", "Django", "REST"],  # Skills taught (array)
    "objectives": ["Build web apps", "..."], # Learning objectives (array)
}
```

#### Platform-Specific Extensions:

**Udemy Additional Fields:**

```python
{
    "num_subscribers": 50000,      # Student enrollment count
    "duration_hours": 12.5,        # Total video content hours
    "num_lectures": 150,           # Number of individual lessons
    "bestseller": true,            # Bestseller badge status
    "last_updated": "2026-01",     # Last content update month
}
```

**Coursera Additional Fields:**

```python
{
    "num_enrolled": 75000,         # Course enrollment count
    "institution": "Stanford",     # University/institution partner
    "course_type": "Course",       # Course/Specialization/Degree
    "duration_weeks": 8,           # Estimated completion time
}
```

**YouTube Additional Fields:**

```python
{
    "view_count": 1000000,         # Video/playlist total views
    "playlist_item_count": 25,     # Number of videos in playlist
    "duration_seconds": 3600,      # Total content duration
    "tags": ["python", "tutorial"], # Video tags array
    "channel_name": "TechTutor",   # YouTube channel name
}
```

### **Output Formats**

#### Development Output (CSV):

```
scrape_output/
├── udemy/udemy_development_20260318_143000.csv
├── coursera/coursera_data-science_20260318_143100.csv
├── w3schools/w3schools_python_20260318_143200.csv
├── khan_academy/khan_academy_computing_20260318_143300.csv
└── youtube/youtube_machine_learning.csv
```

#### Production Output (MinIO JSON):

```
bronze/
├── udemy/year=2026/month=03/day=18/
│   ├── a1b2c3d4-e5f6-g7h8-i9j0-uuid5based123.json
│   └── k1l2m3n4-o5p6-q7r8-s9t0-uuid5based456.json
├── coursera/year=2026/month=03/day=18/
└── [similar structure for other platforms]
```

---

## 🔄 Usage Examples

### **1. Run Individual Platform (Development)**

```bash
cd scrape/

# Scrape Udemy development category
python run.py --platform udemy --category development --max-pages 5

# Search-based scraping across all platforms
python run.py --platform all --search "machine learning" --max-pages 3

# Scrape specific W3Schools tutorials
python run.py --platform w3schools --category python

# YouTube with API key
python run.py --platform youtube --search "python tutorial" --api-key YOUR_KEY
```

### **2. View Available Categories**

```bash
cd scrape/
python run.py --list-categories
```

Output:

```
========== Udemy Categories ==========
development                         Development
business                           Business
it-and-software                    IT & Software
design                            Design
marketing                         Marketing

========== Coursera Categories ==========
data-science                       Data Science
computer-science                   Computer Science
business                          Business
information-technology            Information Technology
```

### **3. Production Pipeline (Airflow)**

```bash
# Via Airflow CLI
astro dev run dags trigger bronze_ingestion

# Via Airflow UI
# 1. Navigate to http://localhost:8080
# 2. Find "bronze_ingestion" DAG
# 3. Toggle ON and click "Trigger DAG"
```

### **4. Access Stored Data (MinIO)**

```python
import boto3
import json

# Connect to MinIO
s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin'
)

# List objects in bronze bucket
response = s3_client.list_objects_v2(
    Bucket='bronze',
    Prefix='udemy/year=2026/month=03/'
)

# Download and read course data
s3_client.download_file(
    'bronze',
    'udemy/year=2026/month=03/day=18/course-uuid.json',
    'local_course.json'
)

with open('local_course.json', 'r') as f:
    course_data = json.load(f)
    print(f"Course: {course_data['title']}")
    print(f"Rating: {course_data['rating']}")
```

---

## ⚙️ Configuration & Customization

### **Environment Variables**

```bash
# YouTube API (optional)
YOUTUBE_API_KEY=your_youtube_api_key

# MinIO Configuration (defaults work for local development)
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Scraping Configuration
SCRAPE_PKG_DIR=/usr/local/airflow/scrape/
```

### **Airflow Configuration** (`airflow_settings.yaml`)

```yaml
# Add custom connections/variables
connections:
  - conn_id: minio_default
    conn_type: aws
    host: localhost:9000
    login: minioadmin
    password: minioadmin

variables:
  - key: scrape_max_pages
    val: "5"
  - key: scrape_delay_seconds
    val: "2"
```

### **Scraper Settings** (`scrape/shared/config.py`)

```python
# Global timeouts and delays
DEFAULT_TIMEOUT = 30          # HTTP request timeout
PAGE_LOAD_DELAY = 2          # Seconds between page loads
ELEMENT_WAIT_TIMEOUT = 10    # Selenium element wait time

# Chrome browser arguments for anti-detection
CHROME_ARGS = [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-features=VizDisplayCompositor',
    '--disable-automation',
    '--disable-plugins-discovery'
]
```

---

## 🔍 Monitoring & Troubleshooting

### **Airflow Monitoring**

- **DAG View:** http://localhost:8080 - Monitor task status and execution history
- **Task Logs:** Click on individual tasks to view detailed execution logs
- **Gantt Chart:** Visualize task timing and identify bottlenecks
- **Graph View:** Understand task dependencies and data flow

### **MinIO Monitoring**

- **Console:** http://localhost:9001 - Browse stored objects and view metrics
- **Bucket Statistics:** Monitor object counts and storage usage
- **Access Logs:** Track upload/download activity and performance

### **Common Issues & Solutions**

#### 1. Chrome Driver Issues

```bash
# Update chromedriver to latest version
pip install --upgrade undetected-chromedriver webdriver-manager

# Clear existing driver cache
rm -rf ~/.cache/selenium/
rm -rf ~/.wdm/

# Reset Chrome user data directory
rm -rf /tmp/.com.google.Chrome.*
```

#### 2. Memory Issues (Large Datasets)

```python
# Enable streaming mode to reduce memory usage
scraper = UdemyScraper(stream_mode=True)

# Reduce max_pages for testing/development
python run.py --platform udemy --category development --max-pages 1

# Monitor memory usage during execution
docker stats astro_scheduler astro_webserver
```

#### 3. Rate Limiting & IP Blocks

```python
# Enable proxy rotation (use with caution)
python run.py --use-proxies --platform coursera --category data-science

# Increase delays between requests
PAGE_LOAD_DELAY = 5  # Increase from default 2 seconds
ELEMENT_WAIT_TIMEOUT = 15  # Increase wait times

# Use custom proxy list
python run.py --proxy-file proxies.txt --platform udemy
```

#### 4. Docker Memory/Resource Issues

```yaml
# In docker-compose.override.yml, add resource limits:
services:
  scheduler:
    mem_limit: 2g
    cpus: 1.0
  webserver:
    mem_limit: 2g
    cpus: 0.5
```

---

## 🧪 Development & Testing

### **Running Tests**

```bash
# Install test dependencies
pip install pytest pytest-cov

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/dags/test_dag_example.py

# Run with coverage report
pytest --cov=scrape --cov-report=html tests/
```

### **Local Development Setup**

```bash
# Clone and setup virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install all dependencies
pip install -r requirements.txt
pip install -r scrape/requirements.txt

# Install development tools
pip install black flake8 mypy pytest

# Format and lint code
black scrape/
flake8 scrape/ --max-line-length=88
mypy scrape/
```

### **Adding New Platforms**

1. **Create platform directory:**

```bash
mkdir scrape/new_platform/
cd scrape/new_platform/
touch __init__.py scraper.py config.py exporter.py
```

2. **Implement scraper class:**

```python
# new_platform/scraper.py
from shared.browser_factory import create_chrome_driver

class NewPlatformScraper:
    def __init__(self, **kwargs):
        self.driver = create_chrome_driver(**kwargs)

    def scrape_category(self, category, max_pages=None):
        """Implement platform-specific scraping logic"""
        pass

    def scrape_search_results(self, query, max_pages=None):
        """Implement search functionality"""
        pass
```

3. **Add to DAG:**

```python
# In dags/bronze_ingestion_dag.py
from include.bronze_ingestion import scrape_new_platform

NEW_PLATFORM_CATEGORIES = ["category1", "category2"]

for cat in NEW_PLATFORM_CATEGORIES:
    @task(task_id=f"new_platform_{cat}")
    def run(category=cat):
        return scrape_new_platform(category=category)
```

---

## 📈 Performance Optimization

### **Scraping Performance**

- **Parallel Execution:** Multi-threading for independent categories
- **Headless Browsing:** Disable GUI for 2-3x speed improvement
- **Smart Caching:** Store frequently accessed category pages
- **Selective Scraping:** Focus on high-value/popular categories
- **Request Batching:** Group API calls where possible

### **Data Storage Optimization**

- **Hive Partitioning:** Enables efficient date-range queries
- **JSON Compression:** MinIO automatically compresses stored objects
- **UUID5 Deduplication:** Prevents storage of duplicate courses
- **Batch Uploads:** Group multiple courses per MinIO request
- **Lifecycle Policies:** Automatic cleanup of old development data

### **Resource Management**

- **Memory Optimization:** Streaming CSV export prevents memory spikes
- **CPU Throttling:** Limit concurrent Airflow tasks (`max_active_tasks=2`)
- **Network Distribution:** Proxy rotation spreads request load
- **Disk Cleanup:** Automatic removal of temporary browser files
- **Container Limits:** Resource constraints prevent system overload

---

## 🎯 Future Enhancements

<!-- ### **Silver Layer Processing**

- **Data Cleaning:** Standardize pricing, ratings, and text formatting
- **Feature Engineering:** Extract skills, difficulty levels, topic tags
- **Cross-Platform Matching:** Identify similar courses across platforms
- **Time Series Analysis:** Track course popularity and pricing trends -->

### **Gold Layer Analytics**

- **Recommendation Engine:** ML-based course suggestions
- **Skill Gap Analysis:** Identify learning path opportunities
- **Market Intelligence:** Competitive analysis and trend forecasting
- **Learning Path Optimization:** Personalized curriculum generation

### **Advanced Features**

- **Real-Time Streaming:** Kafka/Kinesis for live data ingestion
- **Machine Learning:** Auto-categorization and content classification
- **Natural Language Processing:** Enhanced description analysis
- **Advanced Scheduling:** Airflow sensors for dependency-based execution
- **API Gateway:** REST API for external data access

---

## 📊 Project Statistics & Impact

### **Current Data Collection Capacity**

- **5 platforms** actively scraped with full automation
- **50+ categories** across all educational domains
- **100,000+ courses** potential in full dataset
- **Weekly refresh** maintains data recency and accuracy

### **Technical Performance Metrics**

- **~2 hours** full pipeline execution time (all platforms)
- **30+ fields** in unified data schema
- **JSON format** enables flexible querying and analysis
- **Hive partitioning** supports scalable data warehouse patterns
- **99% uptime** with Airflow retry and error handling

### **Data Engineering Best Practices Demonstrated**

- ✅ **Medallion Architecture** (Bronze/Silver layer implemented, Gold planned)
- ✅ **Infrastructure as Code** (Docker Compose, configuration management)
- ✅ **Data Quality** (Schema validation, duplicate detection)
- ✅ **Monitoring & Observability** (Airflow UI, MinIO console, logging)
- ✅ **Scalable Storage** (Object storage with partitioning)
- ✅ **Error Handling** (Retries, timeouts, graceful degradation)
- ✅ **Security** (Credential management, network isolation)

---

## 📞 Support & Contributing

### **Getting Help**

1. **Documentation:** Check this README and inline code comments
2. **Issues:** Create GitHub issues with detailed problem descriptions
3. **Logs:** Include Airflow task logs and error traces
4. **Environment:** Specify OS, Docker version, and Python version

### **Contributing Guidelines**

1. **Fork Repository:** Create your own copy for development
2. **Feature Branches:** Use descriptive branch names (`feature/youtube-api-v4`)
3. **Code Quality:** Ensure tests pass and code follows style guidelines
4. **Documentation:** Update README and add inline comments
5. **Pull Requests:** Provide detailed descriptions and test results

### **Development Standards**

```bash
# Code formatting
black scrape/ --line-length 88

# Linting
flake8 scrape/ --max-line-length=88 --ignore=E203,W503

# Type checking
mypy scrape/ --ignore-missing-imports

# Testing
pytest tests/ --cov=scrape --cov-report=term-missing
```

---

## 🏆 Conclusion

This **Educational Data Engineering Pipeline** represents a comprehensive, production-ready solution for large-scale educational content aggregation. By combining modern data orchestration (Apache Airflow), scalable object storage (MinIO), and robust web scraping techniques, the project creates a foundation for advanced educational analytics and machine learning initiatives.

**Key Achievements:**

- **Unified data schema** enabling cross-platform course analysis
- **Scalable architecture** supporting expansion to additional platforms
- **Enterprise-grade reliability** with comprehensive error handling
- **Modern data engineering practices** following industry best practices
- **Extensible codebase** ready for future enhancements

The project serves as both a practical data collection tool and a demonstration of advanced data engineering concepts, making it valuable for educational research, market analysis, and curriculum development initiatives.

---

_🚀 Built with passion for educational data engineering | Last Updated: March 2026_

**Technologies:** Python • Apache Airflow • MinIO • Docker • Selenium • YouTube API
**Architecture:** Medallion Lakehouse • Bronze Layer • Hive Partitioning • Object Storage
**Platforms:** Udemy • Coursera • W3Schools • Khan Academy • YouTube
