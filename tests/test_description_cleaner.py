import polars as pl
import pytest

from pyatlas.data.description.description_cleaner import DescriptionCleaner


@pytest.fixture
def cleaner():
    return DescriptionCleaner()


def test_extract_text_adds_output_column(cleaner):
    df = pl.DataFrame(
        {
            "description": ["# Hello"],
            "description_content_type": ["text/markdown"],
        }
    )
    result = cleaner.extract_text(df, input_col="description", output_col="text")
    assert "text" in result.columns


def test_extract_text_markdown(cleaner):
    df = pl.DataFrame(
        {
            "description": ["# Title\n\nSome **bold** text."],
            "description_content_type": ["text/markdown"],
        }
    )
    result = cleaner.extract_text(df, input_col="description", output_col="text")
    assert "Title" in result["text"][0]


def test_extract_text_multiple_rows(cleaner):
    df = pl.DataFrame(
        {
            "description": ["# First", "# Second"],
            "description_content_type": ["text/markdown", "text/markdown"],
        }
    )
    result = cleaner.extract_text(df, input_col="description", output_col="text")
    assert len(result) == 2
    assert "First" in result["text"][0]
    assert "Second" in result["text"][1]


def test_extract_text_null_returns_empty(cleaner):
    df = pl.DataFrame(
        {
            "description": [None],
            "description_content_type": ["text/markdown"],
        }
    )
    result = cleaner.extract_text(df, input_col="description", output_col="text")
    assert result["text"][0] == ""
