# Coursera Course Scraper

A Selenium-based web scraper for extracting course data from [Coursera](https://www.coursera.org).

## Features

- **Selenium + undetected-chromedriver** to bypass bot detection
- **Proxy rotation** for avoiding IP bans
- **Multiple export formats**: CSV, JSON, Excel
- **ML-ready data export** with feature engineering
- **Streaming CSV** writer for large datasets
- **Source column** (`coursera`) on every row for multi-platform pipelines

## Extracted Fields

| Field             | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `title`           | Course title                                           |
| `url`             | Full course URL                                        |
| `rating`          | Average rating (0-5)                                   |
| `num_reviews`     | Number of reviews                                      |
| `num_enrolled`    | Enrollment count                                       |
| `institution`     | Offering university / company                          |
| `instructor_name` | Lead instructor                                        |
| `level`           | Beginner / Intermediate / Advanced                     |
| `course_type`     | Course, Specialization, Professional Certificate, etc. |
| `duration_weeks`  | Estimated duration in weeks                            |
| `language`        | Primary language                                       |
| `skills`          | Skills covered (pipe-separated)                        |
| `category`        | Category used during scraping                          |
| `source`          | Always `coursera`                                      |
| `scraped_at`      | ISO timestamp                                          |

## Installation

```bash
pip install -r requirements.txt
```

## Standalone Usage

```bash
# Search
python main.py --search "machine learning" --max-pages 5

# By category
python main.py --category data-science --max-pages 10

# With subcategory
python main.py --category computer-science --subcategory algorithms

# Show browser window
python main.py --search "python" --show-browser --no-proxies

# List all categories
python main.py --list-categories
```

## Unified Runner (with Udemy)

From the parent `scrape/` directory:

```bash
# Both platforms in parallel
python run.py --platform both --search "data science" --max-pages 5

# Coursera only
python run.py --platform coursera --category data-science -p 10

# List categories for both platforms
python run.py --list-categories
```

Each platform writes to its own CSV file. The `source` column identifies each row.

## Dependencies

- `selenium` / `undetected-chromedriver`
- `beautifulsoup4` / `lxml`
- `pandas` / `openpyxl`
- `requests`
