import re
from dataclasses import dataclass

import polars as pl
from bs4 import BeautifulSoup

CLEANING_FAILED = "cleaning failed!"


@dataclass
class DescriptionCleaner:
    """
    A class that provides methods to clean PyPI package descriptions in a DataFrame column.
    """

    def clean(self, df: pl.DataFrame, input_col: str, output_col: str) -> pl.DataFrame:
        """
        Cleans the text in the specified DataFrame column and returns the modified DataFrame.

        Args:
            df (pl.DataFrame): The DataFrame containing the text column to be cleaned.
            input_col (str): The name of the input column containing the text to be cleaned.
            output_col (str): The name of the output column to store the cleaned text.

        Returns:
            pl.DataFrame: The modified DataFrame with the cleaned text.
        """
        df = df.with_columns(pl.col(input_col).map_elements(self._clean_text, return_dtype=pl.String).alias(output_col))
        return df

    def _clean_text(self, text: str) -> str:
        """
        Cleans the given text by removing HTML tags, markdown image links, markdown badges,
        markdown links, URLs, special markdown characters, markdown headers, and extra whitespaces.

        Args:
            text (str): The text to be cleaned.

        Returns:
            str: The cleaned text.
        """
        try:
            text = self._remove_html_tags(text)
            text = self._remove_markdown_image_links(text)
            text = self._remove_markdown_badges(text)
            text = self._remove_markdown_links(text)
            text = self._remove_urls(text)
            text = self._remove_special_markdown_characters(text)
            text = self._remove_markdown_headers(text)
            text = self._remove_extra_whitespaces(text)
        except:  # noqa: E722
            return CLEANING_FAILED

        return text

    @staticmethod
    def _remove_html_tags(text: str) -> str:
        soup = BeautifulSoup(text, "lxml")
        return soup.get_text(separator=" ")

    @staticmethod
    def _remove_markdown_image_links(text: str) -> str:
        return re.sub(r"!\[.*?\]\(.*?\)", "", text)

    @staticmethod
    def _remove_markdown_badges(text: str) -> str:
        return re.sub(r"\[!\[.*?\]\(.*?\)\]", "", text)

    @staticmethod
    def _remove_markdown_links(text: str) -> str:
        return re.sub(r"\[.*?\]\(.*?\)", "", text)

    @staticmethod
    def _remove_urls(text: str) -> str:
        return re.sub(r"http\S+|www\S+|https\S+", "", text, flags=re.MULTILINE)

    @staticmethod
    def _remove_special_markdown_characters(text: str) -> str:
        return re.sub(r"[#*=_`]", "", text)

    @staticmethod
    def _remove_markdown_headers(text: str) -> str:
        return re.sub(r"\n\s*#{1,6}\s*", " ", text)

    @staticmethod
    def _remove_extra_whitespaces(text: str) -> str:
        return " ".join(text.split())
