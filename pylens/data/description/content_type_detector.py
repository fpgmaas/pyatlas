"""Content type detection for package descriptions."""

import re
from enum import Enum


class ContentType(Enum):
    """Supported content types for package descriptions."""

    MARKDOWN = "markdown"
    RST = "rst"
    PLAIN = "plain"


class ContentTypeDetector:
    """
    Detects content type for package descriptions.

    This class determines whether a description is Markdown, RST, or plain text
    based on the description_content_type field or heuristic pattern matching.
    """

    # RST detection patterns
    _RST_PATTERNS = {  # noqa: RUF012
        "directive": re.compile(r"\.\.\s+\w+::"),  # .. image::, .. code-block::, etc.
        "header_underline": re.compile(r"\n[=\-~`#\"^+*]{3,}\n"),  # === or --- underlines
        "field": re.compile(r":\w+:"),  # :field:, :author:, etc.
        "inline_role": re.compile(r"`[^`]+`_"),  # `link text`_
    }

    # Markdown detection patterns
    _MARKDOWN_PATTERNS = {  # noqa: RUF012
        "header": re.compile(r"^#{1,6}\s+\w+", re.MULTILINE),  # # Header, ## Subheader
        "link": re.compile(r"\[.+?\]\(.+?\)"),  # [text](url)
        "image": re.compile(r"!\[.*?\]\(.+?\)"),  # ![alt](image)
        "bold": re.compile(r"\*\*\w+\*\*|__\w+__"),  # **bold** or __bold__
        "code_block": re.compile(r"```"),  # ``` code block
    }

    def __init__(
        self,
        description_column_name: str = "description",
        description_content_type_column_name: str | None = "description_content_type",
    ):
        """
        Initialize the content type detector.

        Args:
            description_column_name: Name of the column containing description text
            description_content_type_column_name: Name of the column containing content type metadata.
                If None, heuristic detection will always be used.
        """
        self.description_column_name = description_column_name
        self.description_content_type_column_name = description_content_type_column_name

    def detect(self, description: str, content_type: str | None = None) -> ContentType:
        """
        Detect the content type of a description.

        Args:
            description: The description text to analyze
            content_type: Optional content type metadata (e.g., 'text/markdown', 'text/x-rst')

        Returns:
            ContentType enum value (MARKDOWN, RST, or PLAIN)
        """
        # If content_type is provided and not None, use it
        if content_type is not None:
            return self._detect_from_metadata(content_type)

        # Otherwise, use heuristics
        return self._detect_from_heuristics(description)

    def _detect_from_metadata(self, content_type: str) -> ContentType:
        """
        Detect content type from metadata string.

        Args:
            content_type: Content type string (e.g., 'text/markdown', 'text/x-rst')

        Returns:
            ContentType enum value
        """
        content_type_lower = content_type.lower()

        if "markdown" in content_type_lower:
            return ContentType.MARKDOWN
        elif "x-rst" in content_type_lower or "rst" in content_type_lower:
            return ContentType.RST
        else:
            return ContentType.PLAIN

    def _detect_from_heuristics(self, description: str) -> ContentType:
        """
        Detect content type using pattern-based heuristics.

        Args:
            description: The description text to analyze

        Returns:
            ContentType enum value based on pattern matching
        """
        if not description or len(description.strip()) < 10:
            return ContentType.PLAIN

        # Calculate scores for each format
        rst_score = self._calculate_rst_score(description)
        markdown_score = self._calculate_markdown_score(description)

        # Determine content type based on scores
        if rst_score > 0 and rst_score > markdown_score:
            return ContentType.RST
        elif markdown_score > 0:
            return ContentType.MARKDOWN
        else:
            return ContentType.PLAIN

    def _calculate_rst_score(self, text: str) -> int:
        """
        Calculate RST likelihood score based on pattern matches.

        Args:
            text: Description text to analyze

        Returns:
            Integer score representing RST likelihood
        """
        score = 0
        for pattern_name, pattern in self._RST_PATTERNS.items():
            matches = pattern.findall(text)
            if matches:
                # Weight different patterns
                if pattern_name == "directive":
                    score += len(matches) * 5  # Strong indicator
                elif pattern_name == "header_underline":
                    score += len(matches) * 3  # Moderate indicator
                elif pattern_name == "field":
                    # Only count if multiple fields (common in RST)
                    if len(matches) >= 2:
                        score += len(matches) * 2
                else:
                    score += len(matches)
        return score

    def _calculate_markdown_score(self, text: str) -> int:
        """
        Calculate Markdown likelihood score based on pattern matches.

        Args:
            text: Description text to analyze

        Returns:
            Integer score representing Markdown likelihood
        """
        score = 0
        for pattern_name, pattern in self._MARKDOWN_PATTERNS.items():
            matches = pattern.findall(text)
            if matches:
                # Weight different patterns
                if pattern_name in ["header", "link", "image"]:
                    score += len(matches) * 3  # Strong indicators
                elif pattern_name == "code_block":
                    score += len(matches) * 2
                else:
                    score += len(matches)
        return score
