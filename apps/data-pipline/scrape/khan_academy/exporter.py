"""
Data Exporter module for saving scraped Khan Academy data.
"""

import csv
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path

from .scraper import Course
from .config import OUTPUT_FOLDER, CSV_FILENAME
from shared.exporter import StreamingCSVExporter as _BaseStreamingCSVExporter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

KHAN_ACADEMY_FIELDNAMES = [
    "id",
    "title",
    "url",
    "headline",
    "description",
    "rating",
    "num_reviews",
    "num_enrolled",
    "price",
    "is_free",
    "instructor_name",
    "image_url",
    "duration_hours",
    "num_lessons",
    "level",
    "language",
    "has_certificate",
    "skills",
    "category",
    "subcategory",
    "objectives",
    "source",
    "scraped_at",
]


class DataExporter:
    """Handles exporting scraped Khan Academy data to various formats."""

    def __init__(self, output_folder: str = OUTPUT_FOLDER):
        self.output_folder = Path(output_folder)
        self.output_folder.mkdir(parents=True, exist_ok=True)
        self._exported_count = 0

    def export_to_csv(
        self,
        courses: List[Course],
        filename: Optional[str] = None,
        append: bool = False,
    ) -> str:
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"khan_academy_courses_{timestamp}.csv"

        filepath = self.output_folder / filename
        mode = "a" if append and filepath.exists() else "w"
        write_header = mode == "w"

        with open(filepath, mode, newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f, fieldnames=KHAN_ACADEMY_FIELDNAMES, extrasaction="ignore"
            )
            if write_header:
                writer.writeheader()
            for course in courses:
                writer.writerow(course.to_dict())
                self._exported_count += 1

        logger.info(f"Exported {len(courses)} courses to {filepath}")
        return str(filepath)

    def export_to_json(
        self, courses: List[Course], filename: Optional[str] = None
    ) -> str:
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"khan_academy_courses_{timestamp}.json"

        filepath = self.output_folder / filename
        data = [course.to_dict() for course in courses]
        for item in data:
            for key in ("skills", "objectives"):
                if isinstance(item.get(key), str):
                    item[key] = item[key].split("|") if item[key] else []

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        logger.info(f"Exported {len(courses)} courses to {filepath}")
        return str(filepath)

    @property
    def exported_count(self) -> int:
        return self._exported_count


class StreamingCSVExporter(_BaseStreamingCSVExporter):
    """Khan Academy streaming CSV exporter with pre-configured fieldnames."""

    def __init__(self, filepath: str):
        super().__init__(filepath, fieldnames=KHAN_ACADEMY_FIELDNAMES)
