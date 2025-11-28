"""Description parsing and text extraction for package descriptions."""

import readme_renderer.markdown
import readme_renderer.rst
import readme_renderer.txt
from bs4 import BeautifulSoup

from pymap.data.description.content_type_detector import ContentType


def render_and_extract_text(description: str, content_type: ContentType) -> str:
    """
    Render a package description to HTML and extract plain text.

    This function takes a package description and its detected content type,
    renders it to HTML using the appropriate readme_renderer method, then
    extracts plain text using BeautifulSoup.

    Args:
        description: The raw package description text
        content_type: ContentType enum value (MARKDOWN, RST, or PLAIN)

    Returns:
        Plain text extracted from the rendered HTML. Returns empty string
        if rendering fails or description is None/empty.

    Example:
        >>> from pymap.data.content_type_detector import ContentType
        >>> text = "# Hello\\n\\nThis is **bold**."
        >>> result = render_and_extract_text(text, ContentType.MARKDOWN)
        >>> print(result)
        Hello
        This is bold.
    """
    # Handle empty/None descriptions
    if not description or not description.strip():
        return ""

    # Render to HTML based on content type
    try:
        if content_type == ContentType.MARKDOWN:
            html = readme_renderer.markdown.render(description)
        elif content_type == ContentType.RST:
            html = readme_renderer.rst.render(description)
        elif content_type == ContentType.PLAIN:
            html = readme_renderer.txt.render(description)
        else:
            # Fallback: treat as plain text
            html = readme_renderer.txt.render(description)

        # If rendering failed (returns None), return empty string
        if html is None:
            return ""

    except Exception:
        # If any error during rendering, return empty string
        # This handles malformed markup gracefully
        return ""

    # Extract plain text from HTML using BeautifulSoup
    try:
        soup = BeautifulSoup(html, "lxml")
        # `stripped_strings` yields non-empty strings with whitespace removed
        return "\n".join(soup.stripped_strings)
    except Exception:
        return ""
