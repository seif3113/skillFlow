# Khan Academy Scraper

Selenium-based scraper for extracting course data from Khan Academy.

> **Status:** Scaffold — scraping logic is not yet implemented.

## Usage

```bash
# List available categories
python -m khan_academy.main --list-categories

# Scrape a category (once implemented)
python -m khan_academy.main --category math --max-pages 5
```

## Structure

| File          | Purpose                                           |
| ------------- | ------------------------------------------------- |
| `config.py`   | Khan Academy-specific settings (categories, URLs) |
| `scraper.py`  | Selenium scraper class (stub)                     |
| `exporter.py` | CSV / JSON export                                 |
| `main.py`     | CLI entry point                                   |
