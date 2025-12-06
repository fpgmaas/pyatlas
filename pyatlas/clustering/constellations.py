import logging
from dataclasses import dataclass

import numpy as np
import polars as pl
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import minimum_spanning_tree
from scipy.spatial.distance import pdist, squareform

logger = logging.getLogger(__name__)

TOP_PERCENT_PACKAGES = 0.15
MIN_PACKAGES_FOR_CONSTELLATION = 3
CUTOFF_LENGTH_FRAC = 0.05


@dataclass
class ClusterConstellationsGenerator:
    """Generates constellation edges for clusters using minimum spanning trees.

    For each cluster, selects the top packages by weekly downloads and computes
    a minimum spanning tree connecting them based on their 2D coordinates.

    Attributes:
        x_column: Name of the column containing x coordinates.
        y_column: Name of the column containing y coordinates.
        cluster_id_column: Name of the column containing cluster IDs.
        weekly_downloads_column: Name of the column containing weekly download counts.
        name_column: Name of the column containing package names.
        top_percent: Fraction of top packages to include (default 0.1 = 10%).
        min_packages: Minimum number of packages required for a star sign.
    """

    x_column: str = "x"
    y_column: str = "y"
    cluster_id_column: str = "cluster_id"
    weekly_downloads_column: str = "weekly_downloads"
    name_column: str = "name"
    top_percent: float = TOP_PERCENT_PACKAGES
    min_packages: int = MIN_PACKAGES_FOR_CONSTELLATION
    cutoff_length_frac: float = CUTOFF_LENGTH_FRAC

    def generate_constellations(self, df: pl.DataFrame) -> pl.DataFrame:
        """Generates constellation edges for all clusters.

        Args:
            df: DataFrame containing clustered data with coordinates and download counts.

        Returns:
            DataFrame with columns: cluster_id, from_package, to_package, from_x, from_y,
            to_x, to_y representing edges in each cluster's star sign.
        """
        cluster_ids = self._get_unique_cluster_ids(df)
        all_edges = []

        for cluster_id in cluster_ids:
            edges = self._generate_cluster_constellation(df, cluster_id)
            all_edges.extend(edges)
            if edges:
                logger.info(f"Generated {len(edges)} constellation edges for cluster {cluster_id}")
            else:
                logger.info(f"Skipped cluster {cluster_id} (insufficient packages)")

        if not all_edges:
            return pl.DataFrame(all_edges)

        # Filter out edges that are too long in normalized coordinate space
        min_x = float(df[self.x_column].min())  # type: ignore[arg-type]
        max_x = float(df[self.x_column].max())  # type: ignore[arg-type]
        min_y = float(df[self.y_column].min())  # type: ignore[arg-type]
        max_y = float(df[self.y_column].max())  # type: ignore[arg-type]
        range_x = max_x - min_x
        range_y = max_y - min_y

        filtered_edges = []
        for edge in all_edges:
            norm_dx = (edge["to_x"] - edge["from_x"]) / range_x
            norm_dy = (edge["to_y"] - edge["from_y"]) / range_y
            norm_length = np.sqrt(norm_dx**2 + norm_dy**2)
            if norm_length <= self.cutoff_length_frac:
                filtered_edges.append(edge)

        removed_count = len(all_edges) - len(filtered_edges)
        if removed_count > 0:
            logger.info(f"Removed {removed_count} edges exceeding cutoff length {self.cutoff_length_frac}")

        return pl.DataFrame(filtered_edges)

    def _get_unique_cluster_ids(self, df: pl.DataFrame) -> list[str]:
        """Get sorted list of unique cluster IDs, excluding noise (-1)."""
        cluster_ids = df[self.cluster_id_column].unique().to_list()
        return sorted([cid for cid in cluster_ids if cid not in (-1, "-1")])

    def _get_cluster_data(self, df: pl.DataFrame, cluster_id: str) -> pl.DataFrame:
        """Get all packages belonging to a cluster."""
        return df.filter(pl.col(self.cluster_id_column) == cluster_id)

    def _generate_cluster_constellation(self, df: pl.DataFrame, cluster_id: str) -> list[dict]:
        """Generate constellation edges for a single cluster.

        Args:
            df: Full DataFrame with all packages.
            cluster_id: The cluster to process.

        Returns:
            List of edge dictionaries with from/to package info.
        """
        cluster_data = self._get_cluster_data(df, cluster_id)
        n_packages = len(cluster_data)

        n_top = max(self.min_packages, int(n_packages * self.top_percent))

        if n_packages < self.min_packages:
            return []

        top_packages = cluster_data.sort(self.weekly_downloads_column, descending=True).head(n_top)

        if len(top_packages) < self.min_packages:
            return []

        coords = top_packages.select([self.x_column, self.y_column]).to_numpy()
        names = top_packages[self.name_column].to_list()

        mst_edges = self._compute_mst(coords)

        edges = []
        for i, j in mst_edges:
            edges.append(
                {
                    self.cluster_id_column: cluster_id,
                    "from_package": names[i],
                    "to_package": names[j],
                    "from_x": float(coords[i, 0]),
                    "from_y": float(coords[i, 1]),
                    "to_x": float(coords[j, 0]),
                    "to_y": float(coords[j, 1]),
                }
            )

        return edges

    def _compute_mst(self, coords: np.ndarray) -> list[tuple[int, int]]:
        """Compute minimum spanning tree edges from coordinates.

        Args:
            coords: Nx2 array of (x, y) coordinates.

        Returns:
            List of (i, j) index pairs representing MST edges.
        """
        distances = squareform(pdist(coords, metric="euclidean"))
        distance_matrix = csr_matrix(distances)
        mst = minimum_spanning_tree(distance_matrix)
        mst_coo = mst.tocoo()

        edges = list(zip(mst_coo.row, mst_coo.col))
        return edges
