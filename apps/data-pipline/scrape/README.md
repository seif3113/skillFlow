# Multi-Platform Course Scraper

A unified web scraping toolkit that collects course and tutorial data from **5 educational platforms** into a consistent, analysis-ready format. Uses Selenium + undetected-chromedriver for browser-based platforms and the YouTube Data API v3 for YouTube.

| Platform         | Content Type          | Free/Paid Data | Search | All-Categories  |
| ---------------- | --------------------- | -------------- | ------ | --------------- |
| **Udemy**        | Video courses         | Both           | Yes    | By category     |
| **Coursera**     | University courses    | Both           | Yes    | By category     |
| **W3Schools**    | Text tutorials        | Free           | —      | Yes             |
| **Khan Academy** | Video lessons         | Free           | Yes    | Yes             |
| **YouTube**      | Playlists & tutorials | Free           | Yes    | Yes (31 topics) |

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Unified Runner (run.py)](#unified-runner-runpy)
- [Platform-Specific Usage](#platform-specific-usage)
  - [Udemy](#udemy)
  - [Coursera](#coursera)
  - [W3Schools](#w3schools)
  - [Khan Academy](#khan-academy)
  - [YouTube](#youtube)
- [All Available Categories](#all-available-categories)
- [Output Data Schema](#output-data-schema)
- [Project Structure](#project-structure)
- [Proxy & Browser Options](#proxy--browser-options)
- [Tips & Troubleshooting](#tips--troubleshooting)

---

## Installation

```bash
# Clone & enter the project
cd scrape

# Install all dependencies (one file covers all platforms)
pip install -r requirements.txt
```

**Requirements:** Python 3.10+, Google Chrome installed.

Dependencies: `selenium`, `undetected-chromedriver`, `beautifulsoup4`, `lxml`, `pandas`, `openpyxl`, `requests`

> **YouTube only:** You also need a [YouTube Data API v3 key](https://console.cloud.google.com/apis/credentials). The free tier gives 10,000 quota units/day — enough for ~100 searches.

---

## Quick Start

```bash
# See every category across all 5 platforms
python run.py --list-categories

# Scrape a single platform + category
python run.py --platform udemy --category development --max-pages 5
python run.py --platform coursera --category data-science --max-pages 5
python run.py --platform w3schools --category python
python run.py --platform khan_academy --category computing

# Search across Udemy + Coursera + Khan Academy + YouTube
python run.py --platform all --search "machine learning" --max-pages 5 --api-key YOUR_KEY

# Scrape YouTube educational playlists & tutorials
python run.py --platform youtube --search "python" --api-key YOUR_KEY

# Scrape ALL W3Schools tutorials at once
python run.py --platform w3schools

# Scrape ALL Khan Academy subjects
python run.py --platform khan_academy
```

Output goes to `scrape_output/<platform>/` as CSV files.

---

## Unified Runner (`run.py`)

The main entry point that runs one or more scrapers **in parallel threads**.

### Syntax

```
python run.py --platform <PLATFORM> [OPTIONS]
```

### Platform Choices

| Value          | What it does                    |
| -------------- | ------------------------------- |
| `udemy`        | Scrape Udemy only               |
| `coursera`     | Scrape Coursera only            |
| `w3schools`    | Scrape W3Schools only           |
| `khan_academy` | Scrape Khan Academy only        |
| `youtube`      | Scrape YouTube only (API-based) |
| `both`         | Udemy + Coursera (legacy alias) |
| `all`          | All 5 platforms in parallel     |

### Options

| Flag                     | Short | Description                                           |
| ------------------------ | ----- | ----------------------------------------------------- |
| `--category SLUG`        | `-c`  | Category slug to scrape                               |
| `--subcategory SLUG`     | `-s`  | Subcategory (Udemy/Coursera only)                     |
| `--search "QUERY"`       | `-q`  | Search query (Udemy, Coursera, Khan Academy, YouTube) |
| `--max-pages N`          | `-p`  | Limit number of pages per platform                    |
| `--details`              | `-d`  | Fetch full course details — slower but richer data    |
| `--show-browser`         |       | Show Chrome window (useful for debugging)             |
| `--use-proxies`          |       | Enable free proxy rotation                            |
| `--proxy-file FILE`      |       | Use a custom proxy list (ip:port per line)            |
| `--no-proxies`           |       | Disable proxies (default)                             |
| `--output-dir DIR`       |       | Output directory (default: `scrape_output`)           |
| `--udemy-output FILE`    |       | Custom filename for Udemy output                      |
| `--coursera-output FILE` |       | Custom filename for Coursera output                   |
| `--api-key KEY`          |       | YouTube Data API v3 key (or set `YOUTUBE_API_KEY`)    |
| `--list-categories`      |       | Print all categories and exit                         |
| `--verbose`              | `-v`  | Debug-level logging                                   |

### Examples

```bash
# 1. Search "python" on all platforms at once (parallel threads)
python run.py --platform all --search "python" --max-pages 5

# 2. Scrape Udemy development courses with detail enrichment
python run.py --platform udemy --category development --max-pages 10 --details

# 3. Scrape Coursera data-science with a subcategory
python run.py --platform coursera --category data-science --subcategory machine-learning -p 10

# 4. Scrape every W3Schools tutorial (no --category needed)
python run.py --platform w3schools

# 5. Scrape every Khan Academy subject
python run.py --platform khan_academy

# 6. Scrape a specific Khan Academy subject + enrich details
python run.py --platform khan_academy --category math --details

# 7. Search Khan Academy only
python run.py --platform khan_academy --search "algebra"

# 8. Run Udemy + Coursera together with visible browser + proxies
python run.py --platform both --search "data engineering" --show-browser --use-proxies -p 5

# 9. Custom output directory
python run.py --platform w3schools --category python --output-dir my_data

# 10. Verbose debug logging
python run.py --platform coursera --category business -p 3 --verbose

# 11. Search YouTube for playlists & tutorials
python run.py --platform youtube --search "data engineering" --api-key YOUR_KEY

# 12. Scrape all 31 YouTube categories
python run.py --platform youtube --api-key YOUR_KEY
```

---

## Platform-Specific Usage

Each platform has its own `main.py` that can be run standalone.

### Udemy

```bash
cd scrape

# By category (--show-browser recommended to avoid Cloudflare)
python -m udemy.main --category development --max-pages 10 --show-browser

# By subcategory
python -m udemy.main --category development --subcategory web-development --max-pages 5 --show-browser

# Search
python -m udemy.main --search "machine learning" --max-pages 10 --show-browser

# With course detail enrichment (visits each course page — slower)
python -m udemy.main --search "python" --details --show-browser

# ML-ready export with feature engineering
python -m udemy.main --category development --show-browser --ml-format

# Custom output file
python -m udemy.main --category business --show-browser -o my_courses.csv

# Disable proxies for testing
python -m udemy.main --category design --no-proxies --show-browser --max-pages 5

# List categories
python -m udemy.main --list-categories
```

> **Tip:** Udemy detects headless mode aggressively. Always use `--show-browser` for reliable scraping.

### Coursera

```bash
cd scrape

# By category
python -m coursera.main --category data-science --max-pages 10

# By subcategory
python -m coursera.main --category computer-science --subcategory algorithms

# Search
python -m coursera.main --search "machine learning" --max-pages 5

# With detail enrichment
python -m coursera.main --search "deep learning" --details

# Show browser + no proxies
python -m coursera.main --search "python" --show-browser --no-proxies

# List categories
python -m coursera.main --list-categories
```

### W3Schools

```bash
cd scrape

# Single category
python -m w3schools.main --category python

# Scrape ALL 24 tutorial categories
python -m w3schools.main --all-categories

# Show browser (for debugging)
python -m w3schools.main --category html --show-browser

# With proxies
python -m w3schools.main --all-categories --use-proxies

# List categories
python -m w3schools.main --list-categories
```

> **Note:** W3Schools is static HTML — no search endpoint. Use `--all-categories` to get everything, or pick individual categories.

### Khan Academy

```bash
cd scrape

# Single category
python -m khan_academy.main --category computing

# Scrape ALL 9 subject areas
python -m khan_academy.main --all-categories

# Search for courses
python -m khan_academy.main --search "algebra"

# Search + detail enrichment
python -m khan_academy.main --search "biology" --details

# Show browser
python -m khan_academy.main --category math --show-browser

# List categories
python -m khan_academy.main --list-categories
```

### YouTube

```bash
cd scrape

# Search for educational content (playlists + long videos)
python -m youtube.main --search "python" --api-key YOUR_KEY

# Search — playlists only (ordered curriculum, best for roadmap generation)
python -m youtube.main --search "data science" --playlists-only --api-key YOUR_KEY

# Search — long videos only (skip playlists)
python -m youtube.main --search "machine learning" --videos-only --api-key YOUR_KEY

# Scrape a predefined category
python -m youtube.main --category python --api-key YOUR_KEY

# Scrape ALL 31 categories
python -m youtube.main --all-categories --api-key YOUR_KEY --max-pages 2

# Custom minimum duration (default: 600s = 10 min)
python -m youtube.main --search "react" --min-duration 1200 --api-key YOUR_KEY

# List categories
python -m youtube.main --list-categories
```

> **Note:** YouTube uses the Data API v3 — no browser/Selenium needed. Get your free API key at [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Each search costs 100 quota units; the free tier gives 10,000 units/day.

> **For RAG / Roadmap AI:** Playlists are the most valuable — they provide an ordered `topics` list (lesson titles) that gives your AI the curriculum structure. Use `--playlists-only` for best roadmap data.

---

## All Available Categories

### Udemy Categories

| Slug                     | Name                 |
| ------------------------ | -------------------- |
| `development`            | Development          |
| `business`               | Business             |
| `finance-and-accounting` | Finance & Accounting |
| `it-and-software`        | IT & Software        |
| `office-productivity`    | Office Productivity  |
| `personal-development`   | Personal Development |
| `design`                 | Design               |
| `marketing`              | Marketing            |
| `lifestyle`              | Lifestyle            |
| `photography-and-video`  | Photography & Video  |
| `health-and-fitness`     | Health & Fitness     |
| `music`                  | Music                |
| `teaching-and-academics` | Teaching & Academics |

**Udemy Development Subcategories:** `web-development`, `data-science`, `mobile-development`, `programming-languages`, `game-development`, `database-design-development`, `software-testing`, `software-engineering`, `software-development-tools`, `no-code-development`

### Coursera Categories

| Slug                               | Name                             |
| ---------------------------------- | -------------------------------- |
| `data-science`                     | Data Science                     |
| `business`                         | Business                         |
| `computer-science`                 | Computer Science                 |
| `information-technology`           | Information Technology           |
| `language-learning`                | Language Learning                |
| `health`                           | Health                           |
| `personal-development`             | Personal Development             |
| `physical-science-and-engineering` | Physical Science and Engineering |
| `social-sciences`                  | Social Sciences                  |
| `arts-and-humanities`              | Arts and Humanities              |
| `math-and-logic`                   | Math and Logic                   |

**Coursera Subcategories:** `data-analysis`, `machine-learning`, `probability-and-statistics`, `data-management`, `data-mining`, `software-development`, `mobile-and-web-development`, `algorithms`, `computer-security-and-networks`, `design-and-product`

### W3Schools Categories (24 tutorials)

| Slug          | Name                    | Certificate? |
| ------------- | ----------------------- | ------------ |
| `html`        | HTML                    | Yes          |
| `css`         | CSS                     | Yes          |
| `js`          | JavaScript              | Yes          |
| `python`      | Python                  | Yes          |
| `java`        | Java                    | Yes          |
| `sql`         | SQL                     | Yes          |
| `php`         | PHP                     | Yes          |
| `c`           | C                       | —            |
| `cpp`         | C++                     | Yes          |
| `cs`          | C#                      | Yes          |
| `r`           | R                       | —            |
| `react`       | React                   | Yes          |
| `nodejs`      | Node.js                 | —            |
| `typescript`  | TypeScript              | —            |
| `django`      | Django                  | —            |
| `bootstrap`   | Bootstrap               | Yes          |
| `xml`         | XML                     | Yes          |
| `mysql`       | MySQL                   | —            |
| `mongodb`     | MongoDB                 | —            |
| `ai`          | Artificial Intelligence | —            |
| `ml`          | Machine Learning        | —            |
| `datascience` | Data Science            | —            |
| `pandas`      | Pandas                  | —            |
| `numpy`       | NumPy                   | —            |

### Khan Academy Categories (9 subjects)

| Slug                       | Name                     |
| -------------------------- | ------------------------ |
| `math`                     | Math                     |
| `science`                  | Science                  |
| `computing`                | Computing                |
| `arts-and-humanities`      | Arts & Humanities        |
| `economics-finance-domain` | Economics & Finance      |
| `ela`                      | Reading & Language Arts  |
| `test-prep`                | Test Prep                |
| `college-careers-more`     | College, Careers, & More |
| `partner-content`          | Partner Content          |

### YouTube Categories (31 topics)

| Slug               | Name                         |
| ------------------ | ---------------------------- |
| `python`           | Python Programming           |
| `javascript`       | JavaScript                   |
| `java`             | Java Programming             |
| `web-development`  | Web Development              |
| `data-science`     | Data Science                 |
| `machine-learning` | Machine Learning             |
| `deep-learning`    | Deep Learning                |
| `sql`              | SQL & Databases              |
| `react`            | React                        |
| `nodejs`           | Node.js                      |
| `html-css`         | HTML & CSS                   |
| `typescript`       | TypeScript                   |
| `csharp`           | C# Programming               |
| `cpp`              | C++ Programming              |
| `go`               | Go Programming               |
| `rust`             | Rust Programming             |
| `devops`           | DevOps & CI/CD               |
| `docker`           | Docker & Kubernetes          |
| `cloud-computing`  | Cloud Computing              |
| `cybersecurity`    | Cybersecurity                |
| `data-engineering` | Data Engineering             |
| `ai`               | Artificial Intelligence      |
| `nlp`              | Natural Language Processing  |
| `computer-vision`  | Computer Vision              |
| `algorithms`       | Algorithms & Data Structures |
| `system-design`    | System Design                |
| `git`              | Git & GitHub                 |
| `linux`            | Linux                        |
| `flutter`          | Flutter & Dart               |
| `android`          | Android Development          |
| `ios`              | iOS & Swift                  |

---

## Output Data Schema

All 5 scrapers produce CSV files with a **unified core schema** so the data can be merged for cross-platform analysis. Every row has a `source` column identifying its origin.

### Common Fields (all platforms)

| Field             | Type  | Description                                                    |
| ----------------- | ----- | -------------------------------------------------------------- |
| `id`              | int   | Unique identifier (hash-based)                                 |
| `title`           | str   | Course / tutorial title                                        |
| `url`             | str   | Full URL                                                       |
| `headline`        | str   | Short tagline                                                  |
| `description`     | str   | Longer description                                             |
| `rating`          | float | Average rating (0–5), 0 if N/A                                 |
| `num_reviews`     | int   | Review count                                                   |
| `price`           | str   | Price or "Free"                                                |
| `is_free`         | bool  | Whether the course is free                                     |
| `instructor_name` | str   | Instructor or platform name                                    |
| `image_url`       | str   | Thumbnail URL                                                  |
| `level`           | str   | Beginner / Intermediate / Advanced / All Levels                |
| `language`        | str   | Primary language                                               |
| `has_certificate` | bool  | Certificate available                                          |
| `category`        | str   | Category used during scraping                                  |
| `subcategory`     | str   | Subcategory if applicable                                      |
| `skills`          | str   | Skills / topics (pipe-separated)                               |
| `objectives`      | str   | Learning objectives (pipe-separated)                           |
| `source`          | str   | `udemy`, `coursera`, `w3schools`, `khan_academy`, or `youtube` |
| `scraped_at`      | str   | ISO timestamp                                                  |

### Platform-Specific Extras

| Platform         | Extra Fields                                                                                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Udemy**        | `num_subscribers`, `original_price`, `is_paid`, `instructor_title`, `num_lectures`, `duration_hours`, `content_length_min`, `topics`, `last_updated`, `bestseller`, `category_url` + more (30 total) |
| **Coursera**     | `num_enrolled`, `institution`, `course_type`, `duration_weeks`, `hours_per_week`, `num_modules`, `certificate_type`, `is_free`, `skills`, `provider_url` + more (28 total)                           |
| **W3Schools**    | `num_lessons`, `duration_hours`, `num_enrolled` (23 total)                                                                                                                                           |
| **Khan Academy** | `num_lessons`, `duration_hours`, `num_enrolled` (23 total)                                                                                                                                           |

### Field Mapping Across Platforms

When merging data from all platforms, use these equivalences:

| Concept         | Udemy                 | Coursera                            | W3Schools               | Khan Academy            | YouTube                      |
| --------------- | --------------------- | ----------------------------------- | ----------------------- | ----------------------- | ---------------------------- |
| Enrollment      | `num_subscribers`     | `num_enrolled`                      | `num_enrolled`          | `num_enrolled`          | `view_count`                 |
| Lesson count    | `num_lectures`        | `num_modules`                       | `num_lessons`           | `num_lessons`           | `playlist_item_count` / 1    |
| Duration        | `duration_hours`      | `duration_weeks` × `hours_per_week` | `duration_hours`        | `duration_hours`        | `duration_seconds` / 3600    |
| Skills / Topics | `topics`              | `skills`                            | `skills`                | `skills`                | `tags` + `topics` (playlist) |
| Paid?           | `is_paid` (True=paid) | `is_free` (inverted)                | `is_free` (always True) | `is_free` (always True) | `is_free` (always True)      |

### Output File Locations

```
scrape_output/
├── udemy/          ← Udemy CSVs
├── coursera/       ← Coursera CSVs
├── w3schools/      ← W3Schools CSVs
├── khan_academy/   ← Khan Academy CSVs
└── youtube/        ← YouTube CSVs
```

Files are named: `<platform>_<category_or_query>_<timestamp>.csv`

---

## Project Structure

```
scrape/
├── run.py                  # Unified multi-platform runner (threaded)
├── requirements.txt        # All Python dependencies
├── README.md               # This file
│
├── shared/                 # Shared infrastructure (no duplication)
│   ├── config.py           # Timeouts, retry settings, Chrome args
│   ├── browser_factory.py  # Chrome driver creation with version detection
│   ├── proxy_manager.py    # Proxy rotation from free sources
│   ├── exporter.py         # StreamingCSVExporter base class
│   └── utils.py            # Common utilities
│
├── udemy/                  # Udemy scraper
│   ├── config.py           # Categories, subcategories, URLs
│   ├── scraper.py          # UdemyScraper + 30-field Course dataclass
│   ├── exporter.py         # CSV/JSON/Excel export
│   ├── main.py             # Standalone CLI
│   └── utils.py            # Price/duration parsing helpers
│
├── coursera/               # Coursera scraper
│   ├── config.py           # Categories, subcategories, URLs
│   ├── scraper.py          # CourseraScraper + 28-field Course dataclass
│   ├── exporter.py         # CSV/JSON/Excel export
│   ├── main.py             # Standalone CLI
│   └── utils.py            # Enrollment/rating parsing helpers
│
├── w3schools/              # W3Schools scraper
│   ├── config.py           # 24 categories + certificate list
│   ├── scraper.py          # W3SchoolsScraper + 23-field Course dataclass
│   ├── exporter.py         # CSV/JSON export
│   └── main.py             # Standalone CLI
│
├── khan_academy/           # Khan Academy scraper
│   ├── config.py           # 9 subject categories
│   ├── scraper.py          # KhanAcademyScraper + 23-field Course dataclass
│   ├── exporter.py         # CSV/JSON export
│   └── main.py             # Standalone CLI
│
├── youtube/                # YouTube scraper (API-based, no Selenium)
│   ├── config.py           # 31 topic categories, API settings
│   ├── scraper.py          # YouTubeScraper + 36-field Course dataclass
│   ├── exporter.py         # CSV/JSON export
│   └── main.py             # Standalone CLI
│
└── scrape_output/          # Generated CSV output (gitignored)
    ├── udemy/
    ├── coursera/
    ├── w3schools/
    ├── khan_academy/
    └── youtube/
```

---

## Proxy & Browser Options

### Proxy Rotation

By default proxies are **disabled**. Enable them when your IP gets rate-limited:

```bash
# Use free proxy sources (unreliable but free)
python run.py --platform coursera --search "python" --use-proxies

# Use your own proxy list
python run.py --platform udemy --category design --proxy-file proxies.txt
```

Proxy file format (one per line):

```
123.45.67.89:8080
98.76.54.32:3128
```

### Browser Visibility

```bash
# Show the Chrome window (useful for debugging + required for Udemy)
python run.py --platform udemy --category development --show-browser

# Headless mode (default, faster, works for Coursera/W3Schools/Khan Academy)
python run.py --platform coursera --search "python"
```

---

## Tips & Troubleshooting

### General

- **First run is slow** — undetected-chromedriver patches the Chrome binary on first launch. Subsequent runs are faster.
- **Parallel runs** — When using `--platform all`, threads start with an 8-second stagger so they don't fight over chromedriver patching.
- **Logs** — All runs write to `run_scraper.log` as well as stdout.
- **Keyboard interrupt** — Press `Ctrl+C` to gracefully stop. Data scraped so far is already saved (streaming CSV).

### Udemy

- **Always use `--show-browser`** — Udemy's Cloudflare protection blocks headless Chrome.
- Use `--details` to fetch full descriptions but expect 2-3× slower scraping.
- Price data includes current and original prices.

### Coursera

- Works well in headless mode.
- Some categories have subcategories — use `--subcategory` for narrower results.
- Course types include Courses, Specializations, Professional Certificates, and Degrees.

### W3Schools

- **No search endpoint** — use `--all-categories` to scrape everything.
- Each sidebar section on a tutorial page becomes one Course entry with topics listed as skills.
- The `has_certificate` field is `True` for categories that offer W3Schools paid certificates.

### Khan Academy

- **React SPA** — the scraper waits extra time for React hydration and scrolls to trigger lazy loading.
- Three extraction strategies are tried automatically: `__NEXT_DATA__` JSON → DOM cards → JSON-LD.
- Use `--search` to find courses by keyword or `--all-categories` for full coverage.
- `--details` enriches each course by visiting its page (slower but adds lesson counts and skills).

### YouTube

- **API key required** — Get a free key at [Google Cloud Console](https://console.cloud.google.com/apis/credentials): enable the "YouTube Data API v3", create credentials → API Key.
- **Quota:** Each search costs 100 units; detail lookups cost 1 unit. Free tier = 10,000 units/day ≈ 100 searches.
- **No browser needed** — YouTube uses pure HTTP API calls via `requests`, so no Chrome/Selenium.
- **Content types:** `playlist` (multi-video ordered curriculum), `full_course` (single video ≥60 min), `tutorial` (≥20 min), `lecture` (≥10 min).
- **RAG tip:** The `topics` field on playlists contains ordered lesson titles — perfect for roadmap generation. The `description`, `tags`, and `objectives` fields give rich context for vector embeddings.
- **Playlists only:** Use `--playlists-only` when you specifically want structured learning paths for your roadmap generator.

### Common Errors

| Error                           | Fix                                                                       |
| ------------------------------- | ------------------------------------------------------------------------- |
| `ChromeDriver version mismatch` | Update Chrome or let undetected-chromedriver auto-detect                  |
| `Access Denied / Captcha`       | Use `--show-browser`, add `--use-proxies`, or wait and retry              |
| `Timeout`                       | The default timeout is 20s. The scraper retries 3 times automatically     |
| `WinError 6: handle is invalid` | Harmless Windows cleanup message — suppressed automatically               |
| `No courses found`              | Check the category slug with `--list-categories`                          |
| `YouTube API quotaExceeded`     | Wait until midnight Pacific Time for quota reset, or request higher quota |

---

## Merging Data for Analysis

Since all platforms share a common core schema, you can combine the CSVs:

```python
import pandas as pd
import glob

# Load all platform CSVs
files = glob.glob("scrape_output/**/*.csv", recursive=True)
dfs = [pd.read_csv(f) for f in files if f.endswith(".csv")]

# Merge on common columns
common_cols = [
    "title", "url", "description", "rating", "price",
    "is_free", "level", "language", "has_certificate",
    "category", "source", "scraped_at",
]
merged = pd.concat([df[common_cols] for df in dfs], ignore_index=True)
print(f"Total courses: {len(merged)} from {merged['source'].nunique()} platforms")
print(merged["source"].value_counts())
```

---

## License

For educational and research purposes only. Respect each platform's Terms of Service and `robots.txt`.
