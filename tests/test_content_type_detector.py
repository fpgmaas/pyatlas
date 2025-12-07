import pytest

from pyatlas.data.description.content_type_detector import ContentType, ContentTypeDetector


@pytest.fixture
def detector():
    return ContentTypeDetector()


def test_detect_from_metadata_markdown(detector):
    assert detector.detect("text", content_type="text/markdown") == ContentType.MARKDOWN


def test_detect_from_metadata_rst(detector):
    assert detector.detect("text", content_type="text/x-rst") == ContentType.RST


def test_detect_from_metadata_plain(detector):
    assert detector.detect("text", content_type="text/plain") == ContentType.PLAIN


def test_detect_markdown_heuristic(detector):
    text = "# Header\n\nCheck [this link](https://example.com) for info."
    assert detector.detect(text) == ContentType.MARKDOWN


def test_detect_rst_heuristic(detector):
    text = ".. image:: logo.png\n\n.. note::\n\n   Important info."
    assert detector.detect(text) == ContentType.RST


def test_detect_plain_for_short_text(detector):
    assert detector.detect("short") == ContentType.PLAIN


def test_detect_plain_for_empty(detector):
    assert detector.detect("") == ContentType.PLAIN
