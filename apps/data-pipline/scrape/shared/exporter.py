"""
Streaming CSV exporter — shared across all platform scrapers.
Each platform's exporter defines its own fieldnames and DataExporter,
but uses this StreamingCSVExporter for the streaming write pattern.
"""

import csv
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class StreamingCSVExporter:
    """Streaming CSV exporter that writes courses as they are scraped."""

    def __init__(self, filepath: str, fieldnames: list[str]):
        self.filepath = Path(filepath)
        self.filepath.parent.mkdir(parents=True, exist_ok=True)
        self._count = 0
        self._file = None
        self._writer = None
        self._fieldnames = fieldnames

    def __enter__(self):
        self._file = open(self.filepath, "w", newline="", encoding="utf-8")
        self._writer = csv.DictWriter(
            self._file, fieldnames=self._fieldnames, extrasaction="ignore"
        )
        self._writer.writeheader()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._file:
            self._file.close()
        logger.info(
            f"Streaming export complete: {self._count} courses to {self.filepath}"
        )

    def write(self, course) -> None:
        if self._writer:
            self._writer.writerow(course.to_dict())
            self._count += 1
            if self._count % 100 == 0:
                self._file.flush()

    @property
    def count(self) -> int:
        return self._count
