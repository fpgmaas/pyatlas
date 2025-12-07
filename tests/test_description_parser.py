from pyatlas.data.description.content_type_detector import ContentType
from pyatlas.data.description.description_parser import render_and_extract_text


def test_render_markdown():
    text = "# Hello\n\nThis is **bold** text."
    result = render_and_extract_text(text, ContentType.MARKDOWN)
    assert "Hello" in result
    assert "bold" in result


def test_render_rst():
    text = "Some RST content here."
    result = render_and_extract_text(text, ContentType.RST)
    assert "RST content" in result


def test_render_plain():
    text = "Just plain text."
    result = render_and_extract_text(text, ContentType.PLAIN)
    assert "Just plain text" in result


def test_render_empty_returns_empty():
    assert render_and_extract_text("", ContentType.MARKDOWN) == ""
    assert render_and_extract_text("   ", ContentType.RST) == ""
