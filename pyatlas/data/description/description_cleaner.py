"""Description cleaning and text extraction for PyPI package descriptions."""

import logging
from dataclasses import dataclass

import polars as pl
from tqdm import tqdm

from pyatlas.data.description.content_type_detector import ContentTypeDetector
from pyatlas.data.description.description_parser import render_and_extract_text

logger = logging.getLogger(__name__)


@dataclass
class DescriptionCleaner:
    """
    Extracts plain text from PyPI package descriptions using content-type-aware rendering.
    """

    description_column: str = "description"
    content_type_column: str = "description_content_type"

    def __post_init__(self):
        self.detector = ContentTypeDetector(
            description_column_name=self.description_column,
            description_content_type_column_name=self.content_type_column,
        )

    def extract_text(self, df: pl.DataFrame, input_col: str, output_col: str) -> pl.DataFrame:
        """
        Extracts plain text from package descriptions in the specified DataFrame column.
        """

        # Process with progress bar
        results = []
        total = len(df)

        for row in tqdm(df.iter_rows(named=True), total=total, desc="Extracting text", unit="pkg"):
            results.append(self._process_row(row, input_col=input_col))

        df = df.with_columns(pl.Series(name=output_col, values=results))

        return df

    def _process_row(self, row: dict, input_col: str) -> str:
        description = row.get(input_col)
        content_type_str = row.get(self.content_type_column)

        # Handle None/empty descriptions
        if description is None or not str(description).strip():
            return ""

        try:
            # Detect content type
            detected_type = self.detector.detect(description, content_type=content_type_str)

            # Render and extract text
            extracted = render_and_extract_text(description, detected_type)

            return extracted or ""  # noqa: TRY300

        except Exception as exc:
            # Log warning with some context, but don't break the pipeline
            logger.warning(
                "Failed to extract description text (content_type=%r). Returning empty string.",
                content_type_str,
                exc_info=exc,
            )
            return ""
