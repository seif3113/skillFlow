# Udemy Course Scraper (Selenium Edition)

A comprehensive Selenium-based web scraper for extracting course data from Udemy, designed for ML engineers who need quality training data.

## Features

- **Selenium + Undetected ChromeDriver**: Bypasses Cloudflare / bot detection using `undetected-chromedriver`
- **OOP Design**: Modular architecture with separate classes for scraping, proxy management, and data export
- **Proxy Rotation**: Automatic proxy rotation from free proxy sources to avoid IP bans
- **Auto Chrome Version Detection**: Automatically detects your installed Chrome version
- **Multiple Export Formats**: CSV, JSON, and Excel support
- **ML-Ready Export**: Feature-engineered data export with numeric conversions and derived features
- **Streaming Export**: Memory-efficient streaming to handle large datasets
- **Flexible Scraping**: Scrape by category, subcategory, or search query

## Installation

```bash
# Navigate to the project folder
cd udemy

# Install dependencies
pip install -r requirements.txt
```

> **Note**: Requires Google Chrome to be installed. The scraper auto-detects your Chrome version.

## Quick Start

### Scrape by Category

```bash
# Scrape development courses with visible browser (recommended)
python main.py --category development --show-browser

# Scrape specific number of pages
python main.py --category business --max-pages 20 --show-browser

# Scrape with subcategory
python main.py --category development --subcategory web-development --max-pages 10 --show-browser
```

> **Important**: Use `--show-browser` to avoid Cloudflare blocking. Headless mode is more likely to be detected and blocked.

### Search for Courses

```bash
# Search for machine learning courses
python main.py --search "machine learning" --max-pages 10 --show-browser

# Search for Python courses
python main.py --search "python programming" --show-browser
```

### Export Formats

```bash
# Standard CSV export
python main.py --category development --show-browser -o courses.csv

# ML-ready format with feature engineering
python main.py --category development --show-browser --ml-format

# Include detailed course information (slower — visits each course page)
python main.py --category development --show-browser --details
```

### Proxy Options

```bash
# Disable proxies (for testing / when your IP is clean)
python main.py --category design --no-proxies --show-browser --max-pages 5

# Use custom proxy file
python main.py --category business --proxy-file my_proxies.txt --show-browser
```

## Available Categories

Use `--list-categories` to see all available categories:

```bash
python main.py --list-categories
```

Main categories:

- `development` - Development
- `business` - Business
- `finance-and-accounting` - Finance & Accounting
- `it-and-software` - IT & Software
- `office-productivity` - Office Productivity
- `personal-development` - Personal Development
- `design` - Design
- `marketing` - Marketing
- `lifestyle` - Lifestyle
- `photography-and-video` - Photography & Video
- `health-and-fitness` - Health & Fitness
- `music` - Music
- `teaching-and-academics` - Teaching & Academics

## Output Data

### Standard CSV Columns

| Column           | Description                                 |
| ---------------- | ------------------------------------------- |
| id               | Unique course identifier                    |
| title            | Course title                                |
| url              | Full URL to the course                      |
| headline         | Short course description                    |
| description      | Full course description                     |
| rating           | Average rating (0-5)                        |
| num_reviews      | Number of reviews                           |
| num_subscribers  | Number of enrolled students                 |
| price            | Current price                               |
| original_price   | Original price before discount              |
| is_paid          | Whether the course is paid                  |
| instructor_name  | Primary instructor name                     |
| instructor_title | Instructor's professional title             |
| image_url        | Course thumbnail URL                        |
| duration_hours   | Total content duration in hours             |
| num_lectures     | Number of video lectures                    |
| num_articles     | Number of articles                          |
| num_resources    | Number of downloadable resources            |
| level            | Course level (Beginner, Intermediate, etc.) |
| language         | Primary language                            |
| has_certificate  | Whether a certificate is provided           |
| last_updated     | Last update date                            |
| category         | Course category                             |
| subcategory      | Course subcategory                          |
| topics           | Pipe-separated list of topics               |
| objectives       | What you'll learn (pipe-separated)          |
| requirements     | Prerequisites (pipe-separated)              |
| target_audience  | Target audience (pipe-separated)            |
| scraped_at       | Scraping timestamp                          |

### ML-Ready Export

The `--ml-format` option adds these additional columns:

- `price_numeric` - Price as a number
- `rating_per_review` - Rating/reviews ratio
- `reviews_per_subscriber` - Engagement ratio
- `minutes_per_lecture` - Average lecture length
- `title_length` - Character count
- `headline_length` - Character count
- `description_length` - Character count
- `title_word_count` - Word count
- `level_*` - One-hot encoded level
- `num_topics` - Number of topics
- `is_free` - Binary free indicator
- `has_certificate_int` - Binary certificate indicator

## Python API Usage

```python
from udemy import UdemyScraper, DataExporter, ProxyManager

# Initialize (show-browser mode recommended)
proxy_manager = ProxyManager(use_free_proxies=True)
scraper = UdemyScraper(proxy_manager=proxy_manager, headless=False)

# Scrape courses
courses = []
try:
    for course in scraper.scrape_category('development', max_pages=10):
        courses.append(course)
        print(f"Scraped: {course.title} — ★{course.rating}")
finally:
    scraper.close()

# Export to CSV
exporter = DataExporter()
exporter.export_to_csv(courses, 'my_courses.csv')

# Export ML-ready format
exporter.export_for_ml(courses, 'ml_ready_courses.csv')
```

## Custom Proxy File Format

Create a text file with proxies in one of these formats:

```
# IP:PORT format
192.168.1.1:8080
10.0.0.1:3128

# IP:PORT:USER:PASS format (for authenticated proxies)
192.168.1.1:8080:username:password
```

## Rate Limiting & Anti-Ban

The scraper includes several features to avoid being blocked:

1. **Undetected ChromeDriver** — patches Chrome to remove automation fingerprints
2. **Random delays** between page loads (3–7 seconds by default)
3. **Scroll-based lazy loading** — scrolls gradually to trigger course card rendering
4. **Proxy rotation** with automatic failover and blacklisting
5. **Block/captcha detection** — heuristic checks for Cloudflare challenge pages
6. **Automatic retry** with proxy rotation on failure

## Project Structure

```
udemy/
├── __init__.py          # Package initialization
├── config.py            # Configuration settings
├── proxy_manager.py     # Proxy rotation and management
├── scraper.py           # Main scraping logic
├── exporter.py          # Data export handlers
├── main.py              # CLI entry point
├── requirements.txt     # Python dependencies
└── README.md            # This file
```

## Troubleshooting

### Cloudflare blocking / "Just a moment" page

- Use `--show-browser` — headless mode is more easily detected by Cloudflare
- Try adding `--no-proxies` if free proxies are being flagged
- The scraper will auto-retry with proxy rotation when blocks are detected

### No courses found

- Try running without proxies first: `--no-proxies`
- Check if the category name is correct: `--list-categories`
- Udemy may have updated their DOM structure

### ChromeDriver version mismatch

- The scraper auto-detects your Chrome version from the Windows registry
- If detection fails, update Chrome to the latest version or install a matching ChromeDriver manually

### Connection errors

- Free proxies may be unreliable, try again or use your own proxies
- Check your internet connection
- Udemy may be blocking your IP temporarily

### Memory issues with large datasets

- The scraper uses streaming export by default
- Avoid using `--details` for large scrapes (it visits each individual course page)

## Legal Notice

This scraper is for educational and research purposes only. Please respect Udemy's Terms of Service and robots.txt. Do not use this tool for commercial purposes without proper authorization.

## License

MIT License - See LICENSE file for details.
