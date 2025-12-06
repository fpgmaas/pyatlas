import logging
from dataclasses import dataclass
from typing import cast

import polars as pl

logger = logging.getLogger(__name__)


@dataclass
class ClusterMetadataGenerator:
    """Generates metadata for clusters including centroids and statistics.

    Attributes:
        x_column: Name of the column containing x coordinates.
        y_column: Name of the column containing y coordinates.
        cluster_id_column: Name of the column containing cluster IDs.
        weekly_downloads_column: Name of the column containing weekly download counts.
    """

    x_column: str = "x"
    y_column: str = "y"
    cluster_id_column: str = "cluster_id"
    weekly_downloads_column: str = "weekly_downloads"

    def generate_cluster_metadata(self, df: pl.DataFrame) -> pl.DataFrame:
        """Generates metadata for each cluster including centroids and bounding boxes.

        Args:
            df: DataFrame containing clustered data with coordinates and download counts.

        Returns:
            DataFrame with columns: cluster_id, centroid_x, centroid_y,
            total_weekly_downloads, min_x, max_x, min_y, max_y.
        """
        cluster_ids = self._get_unique_cluster_ids(df)
        metadata_rows = []

        for cluster_id in cluster_ids:
            centroid = self._calculate_centroid(df, cluster_id)
            total_downloads = self._calculate_total_weekly_downloads(df, cluster_id)
            bounds = self._calculate_bounds(df, cluster_id)

            metadata_rows.append(
                {
                    self.cluster_id_column: cluster_id,
                    "centroid_x": centroid[0],
                    "centroid_y": centroid[1],
                    "total_weekly_downloads": total_downloads,
                    "min_x": bounds["min_x"],
                    "max_x": bounds["max_x"],
                    "min_y": bounds["min_y"],
                    "max_y": bounds["max_y"],
                }
            )
            logger.info(f"Calculated metadata for cluster {cluster_id}")

        # Handle noise cluster (-1) separately
        if "-1" in df[self.cluster_id_column].unique().to_list():
            centroid = self._calculate_centroid(df, "-1")
            total_downloads = self._calculate_total_weekly_downloads(df, "-1")
            bounds = self._calculate_bounds(df, "-1")
            metadata_rows.append(
                {
                    self.cluster_id_column: "-1",
                    "centroid_x": centroid[0],
                    "centroid_y": centroid[1],
                    "total_weekly_downloads": total_downloads,
                    "min_x": bounds["min_x"],
                    "max_x": bounds["max_x"],
                    "min_y": bounds["min_y"],
                    "max_y": bounds["max_y"],
                }
            )
            logger.info("Calculated metadata for noise cluster (-1)")

        return pl.DataFrame(metadata_rows)

    def _get_unique_cluster_ids(self, df: pl.DataFrame) -> list[str]:
        """Get sorted list of unique cluster IDs, excluding noise (-1)."""
        cluster_ids = df[self.cluster_id_column].unique().to_list()
        return sorted([cid for cid in cluster_ids if cid != "-1"])

    def _get_cluster_data(self, df: pl.DataFrame, cluster_id: str) -> pl.DataFrame:
        """Get all packages belonging to a cluster."""
        return df.filter(pl.col(self.cluster_id_column) == cluster_id)

    def _calculate_centroid(self, df: pl.DataFrame, cluster_id: str) -> tuple[float, float]:
        """Calculate the centroid (mean x, y) of a cluster."""
        cluster_data = self._get_cluster_data(df, cluster_id)
        centroid_x = cast(float, cluster_data[self.x_column].mean())
        centroid_y = cast(float, cluster_data[self.y_column].mean())
        return (centroid_x, centroid_y)

    def _calculate_total_weekly_downloads(self, df: pl.DataFrame, cluster_id: str) -> int:
        """Calculate the total weekly downloads for all packages in a cluster."""
        cluster_data = self._get_cluster_data(df, cluster_id)
        total = cluster_data[self.weekly_downloads_column].sum()
        return int(total) if total is not None else 0

    def _calculate_bounds(self, df: pl.DataFrame, cluster_id: str) -> dict[str, float]:
        """Calculate the min and max x, y coordinates for a cluster."""
        cluster_data = self._get_cluster_data(df, cluster_id)
        return {
            "min_x": cast(float, cluster_data[self.x_column].min()),
            "max_x": cast(float, cluster_data[self.x_column].max()),
            "min_y": cast(float, cluster_data[self.y_column].min()),
            "max_y": cast(float, cluster_data[self.y_column].max()),
        }
