# W3Schools Scraper

Selenium-based scraper for extracting tutorial/course data from W3Schools.

> **Status:** Scaffold — scraping logic is not yet implemented.

## Usage

```bash
# List available categories
python -m w3schools.main --list-categories

# Scrape a category (once implemented)
python -m w3schools.main --category python --max-pages 5
```

## Structure

| File          | Purpose                                        |
| ------------- | ---------------------------------------------- |
| `config.py`   | W3Schools-specific settings (categories, URLs) |
| `scraper.py`  | Selenium scraper class (stub)                  |
| `exporter.py` | CSV / JSON export                              |
| `main.py`     | CLI entry point                                |
