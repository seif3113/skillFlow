"""
Data Exporter module for saving scraped data to various formats.
"""

import csv
import json
import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path
import pandas as pd

from .scraper import Course
from .config import OUTPUT_FOLDER, CSV_FILENAME

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DataExporter:
    """
    Handles exporting scraped course data to various formats.
    """

    def __init__(self, output_folder: str = OUTPUT_FOLDER):
        """
        Initialize the data exporter.

        Args:
            output_folder: The folder to save output files.
        """
        self.output_folder = Path(output_folder)
        self.output_folder.mkdir(parents=True, exist_ok=True)
        self._exported_count = 0

    def _get_csv_fieldnames(self) -> List[str]:
        """Get the CSV field names for course data."""
        return [
            "id",
            "title",
            "url",
            "headline",
            "description",
            "rating",
            "num_reviews",
            "num_subscribers",
            "price",
            "original_price",
            "is_paid",
            "instructor_name",
            "instructor_title",
            "image_url",
            "duration_hours",
            "num_lectures",
            "num_articles",
            "num_resources",
            "level",
            "language",
            "has_certificate",
            "last_updated",
            "category",
            "subcategory",
            "topics",
            "objectives",
            "requirements",
            "target_audience",
            "source",
            "scraped_at",
        ]

    def export_to_csv(
        self,
        courses: List[Course],
        filename: Optional[str] = None,
        append: bool = False,
    ) -> str:
        """
        Export courses to a CSV file.

        Args:
            courses: List of Course objects to export.
            filename: Optional custom filename.
            append: Whether to append to existing file.

        Returns:
            Path to the exported file.
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"udemy_courses_{timestamp}.csv"

        filepath = self.output_folder / filename
        mode = "a" if append and filepath.exists() else "w"
        write_header = mode == "w"

        fieldnames = self._get_csv_fieldnames()

        with open(filepath, mode, newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")

            if write_header:
                writer.writeheader()

            for course in courses:
                row = course.to_dict()
                writer.writerow(row)
                self._exported_count += 1

        logger.info(f"Exported {len(courses)} courses to {filepath}")
        return str(filepath)

    def export_single_to_csv(
        self, course: Course, filename: str = CSV_FILENAME
    ) -> None:
        """
        Export a single course to CSV (appending).

        Args:
            course: The Course object to export.
            filename: The CSV filename.
        """
        filepath = self.output_folder / filename
        file_exists = filepath.exists()

        fieldnames = self._get_csv_fieldnames()

        with open(filepath, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")

            if not file_exists:
                writer.writeheader()

            writer.writerow(course.to_dict())
            self._exported_count += 1

    def export_to_json(
        self, courses: List[Course], filename: Optional[str] = None
    ) -> str:
        """
        Export courses to a JSON file.

        Args:
            courses: List of Course objects to export.
            filename: Optional custom filename.

        Returns:
            Path to the exported file.
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"udemy_courses_{timestamp}.json"

        filepath = self.output_folder / filename

        data = [course.to_dict() for course in courses]

        # Convert list fields back to lists for JSON
        for item in data:
            for field in ["topics", "objectives", "requirements", "target_audience"]:
                if isinstance(item.get(field), str):
                    item[field] = item[field].split("|") if item[field] else []

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        logger.info(f"Exported {len(courses)} courses to {filepath}")
        return str(filepath)

    def export_to_excel(
        self, courses: List[Course], filename: Optional[str] = None
    ) -> str:
        """
        Export courses to an Excel file.

        Args:
            courses: List of Course objects to export.
            filename: Optional custom filename.

        Returns:
            Path to the exported file.
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"udemy_courses_{timestamp}.xlsx"

        filepath = self.output_folder / filename

        # Convert courses to dataframe
        data = [course.to_dict() for course in courses]
        df = pd.DataFrame(data)

        # Export to Excel
        df.to_excel(filepath, index=False, engine="openpyxl")

        logger.info(f"Exported {len(courses)} courses to {filepath}")
        return str(filepath)

    def export_for_ml(
        self, courses: List[Course], filename: Optional[str] = None
    ) -> str:
        """
        Export courses in a format optimized for ML training.
        Includes feature engineering and data cleaning.

        Args:
            courses: List of Course objects to export.
            filename: Optional custom filename.

        Returns:
            Path to the exported file.
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"udemy_courses_ml_{timestamp}.csv"

        filepath = self.output_folder / filename

        # Convert to dataframe
        data = [course.to_dict() for course in courses]
        df = pd.DataFrame(data)

        # Feature engineering for ML
        # Clean and normalize numeric fields
        df["rating"] = pd.to_numeric(df["rating"], errors="coerce").fillna(0)
        df["num_reviews"] = pd.to_numeric(df["num_reviews"], errors="coerce").fillna(0)
        df["num_subscribers"] = pd.to_numeric(
            df["num_subscribers"], errors="coerce"
        ).fillna(0)
        df["duration_hours"] = pd.to_numeric(
            df["duration_hours"], errors="coerce"
        ).fillna(0)
        df["num_lectures"] = pd.to_numeric(df["num_lectures"], errors="coerce").fillna(
            0
        )

        # Extract price as numeric (removing currency symbols)
        df["price_numeric"] = df["price"].str.extract(r"([\d.]+)").astype(float)

        # Add derived features
        df["rating_per_review"] = df.apply(
            lambda x: x["rating"] / x["num_reviews"] if x["num_reviews"] > 0 else 0,
            axis=1,
        )
        df["reviews_per_subscriber"] = df.apply(
            lambda x: (
                x["num_reviews"] / x["num_subscribers"]
                if x["num_subscribers"] > 0
                else 0
            ),
            axis=1,
        )
        df["minutes_per_lecture"] = df.apply(
            lambda x: (
                (x["duration_hours"] * 60) / x["num_lectures"]
                if x["num_lectures"] > 0
                else 0
            ),
            axis=1,
        )

        # Create text features (length counts for NLP)
        df["title_length"] = df["title"].str.len().fillna(0)
        df["headline_length"] = df["headline"].str.len().fillna(0)
        df["description_length"] = df["description"].str.len().fillna(0)
        df["title_word_count"] = df["title"].str.split().str.len().fillna(0)

        # One-hot encode level
        if "level" in df.columns:
            level_dummies = pd.get_dummies(df["level"], prefix="level")
            df = pd.concat([df, level_dummies], axis=1)

        # Count topics
        df["num_topics"] = df["topics"].str.count(r"\|") + 1
        df.loc[df["topics"] == "", "num_topics"] = 0

        # Binary features
        df["is_free"] = (~df["is_paid"]).astype(int)
        df["has_certificate_int"] = df["has_certificate"].astype(int)

        # Remove duplicates based on course ID
        df = df.drop_duplicates(subset=["id"])

        # Export
        df.to_csv(filepath, index=False, encoding="utf-8")

        logger.info(f"Exported {len(df)} ML-ready courses to {filepath}")
        return str(filepath)

    @staticmethod
    def load_from_csv(filepath: str) -> List[Dict[str, Any]]:
        """
        Load courses from a CSV file.

        Args:
            filepath: Path to the CSV file.

        Returns:
            List of course dictionaries.
        """
        courses = []
        with open(filepath, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                courses.append(row)
        return courses

    @property
    def exported_count(self) -> int:
        """Get the total number of courses exported."""
        return self._exported_count


# Re-export shared StreamingCSVExporter with Udemy-specific fieldnames
from shared.exporter import StreamingCSVExporter as _BaseStreamingCSVExporter

UDEMY_FIELDNAMES = [
    "id",
    "title",
    "url",
    "headline",
    "description",
    "rating",
    "num_reviews",
    "num_subscribers",
    "price",
    "original_price",
    "is_paid",
    "instructor_name",
    "instructor_title",
    "image_url",
    "duration_hours",
    "num_lectures",
    "num_articles",
    "num_resources",
    "level",
    "language",
    "has_certificate",
    "last_updated",
    "category",
    "subcategory",
    "topics",
    "objectives",
    "requirements",
    "target_audience",
    "source",
    "scraped_at",
]


class StreamingCSVExporter(_BaseStreamingCSVExporter):
    """Udemy streaming CSV exporter with pre-configured fieldnames."""

    def __init__(self, filepath: str):
        super().__init__(filepath, fieldnames=UDEMY_FIELDNAMES)
