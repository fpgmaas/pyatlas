import logging
from dataclasses import dataclass

import polars as pl
from openai import OpenAI

from pyatlas.config import Config

logger = logging.getLogger(__name__)


@dataclass
class ClusterLabeler:
    """Generates descriptive labels for clusters using OpenAI API.

    Attributes:
        summary_column: Name of the column containing package summaries.
        cluster_id_column: Name of the column containing cluster IDs.
        name_column: Name of the column containing package names.
        max_chars_per_summary: Maximum characters to include per package summary.
        max_total_chars: Maximum total characters to send to the API.
    """

    summary_column: str = "summary"
    cluster_id_column: str = "cluster_id"
    name_column: str = "name"
    max_chars_per_summary: int = 256
    max_total_chars: int = 256 * 64

    def generate_cluster_labels(self, df: pl.DataFrame) -> pl.DataFrame:
        """Generates descriptive labels for each cluster using OpenAI API.

        Args:
            df: DataFrame containing clustered data with package names and summaries.

        Returns:
            DataFrame with columns: cluster_id, cluster_label.
        """
        config = Config.load()
        client = OpenAI(api_key=config.openai.openai_api_key)

        cluster_ids = self._get_unique_cluster_ids(df)
        label_rows = []

        for cluster_id in cluster_ids:
            label = self._generate_label_for_cluster(df, cluster_id, client, config.openai.model_name)
            label_rows.append(
                {
                    self.cluster_id_column: cluster_id,
                    "cluster_label": label,
                }
            )
            logger.info(f"Generated label for cluster {cluster_id}: {label}")

        return pl.DataFrame(label_rows)

    def _get_unique_cluster_ids(self, df: pl.DataFrame) -> list[str]:
        """Get sorted list of unique cluster IDs."""
        cluster_ids = df[self.cluster_id_column].unique().to_list()
        return sorted(cluster_ids)

    def _generate_label_for_cluster(self, df: pl.DataFrame, cluster_id: str, client: OpenAI, model_name: str) -> str:
        """Generate a label for a single cluster."""
        if cluster_id == "-1":
            return "Not clustered"

        cluster_data = self._get_cluster_data(df, cluster_id)
        prompt = self._create_prompt(cluster_data)

        try:
            response = client.responses.create(
                model=model_name,
                instructions="You are a helpful assistant that creates concise, descriptive labels for groups of Python packages.",
                input=prompt,
                temperature=1,
                max_output_tokens=1000,
                text={"verbosity": "low"},
                reasoning={"effort": "low"},
            )

            # Access the text output from the response
            label = response.output_text
            if label:
                label = label.strip()
                logger.debug(f"Generated label for cluster {cluster_id}: '{label}'")
                return label
            else:
                logger.warning(f"Empty output_text for cluster {cluster_id}")
                return f"Cluster {cluster_id}"

        except Exception:
            logger.exception(f"Error generating label for cluster {cluster_id}.")
            return f"Cluster {cluster_id}"

    def _get_cluster_data(self, df: pl.DataFrame, cluster_id: str) -> pl.DataFrame:
        """Get all packages belonging to a cluster."""
        return df.filter(pl.col(self.cluster_id_column) == cluster_id)

    def _create_prompt(self, cluster_data: pl.DataFrame) -> str:
        """Create a prompt for the OpenAI API with package names and summaries."""
        packages_info = self._format_packages_info(cluster_data)
        trimmed_info = self._trim_to_max_chars(packages_info)

        return (
            f"Based on the following Python packages and their descriptions, "
            f"provide a short, descriptive label (1-4 words) that captures the main theme or purpose of this group."
            "It will be used as a label for the group in a plot with multiple groups. Only return the label. \n\n"
            f"{trimmed_info}"
        )

    def _format_packages_info(self, cluster_data: pl.DataFrame) -> str:
        """Format package names and summaries into a string."""
        lines = []
        for row in cluster_data.iter_rows(named=True):
            name = row[self.name_column]
            summary = self._trim_summary(row.get(self.summary_column, ""))
            lines.append(f"- {name}: {summary}")

        return "\n".join(lines)

    def _trim_summary(self, summary: str) -> str:
        """Trim a single summary to max characters."""
        if not summary or not isinstance(summary, str):
            return ""
        return summary[: self.max_chars_per_summary]

    def _trim_to_max_chars(self, text: str) -> str:
        """Trim text to maximum total characters."""
        if len(text) <= self.max_total_chars:
            return text
        return text[: self.max_total_chars] + "..."
