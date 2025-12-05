from dataclasses import dataclass

import hdbscan
import numpy as np
import polars as pl
import umap
from sklearn.preprocessing import normalize


@dataclass
class ClusterIdGenerator:
    """Generates cluster IDs for data points using UMAP dimensionality reduction and HDBSCAN clustering.

    This class reduces high-dimensional embeddings using UMAP, then applies HDBSCAN
    to identify dense clusters. Points that don't belong to any cluster are assigned
    a cluster ID of -1.

    Attributes:
        min_cluster_size: Minimum number of points required to form a cluster.
        min_samples: Number of samples in a neighborhood for a point to be a core point.
        cluster_selection_method: Method used to select clusters from the condensed tree.
        cluster_selection_epsilon: Distance threshold for merging clusters. Values around
            0.01 provide best results; higher values result in fewer clusters.
    """

    min_cluster_size: int = 8
    min_samples: int = 2
    cluster_selection_method: str = "leaf"

    # values around 0.01 provided best results. Higher -> poor results; less clusters.
    cluster_selection_epsilon: float = 0.0085

    def generate_cluster_ids(self, df: pl.DataFrame, embeddings_column: str):
        """Assigns cluster IDs to each row in the DataFrame based on embedding similarity.

        Extracts embeddings from the specified column, reduces dimensionality with UMAP,
        normalizes the result, and clusters using HDBSCAN. The resulting cluster IDs are
        added as a new string column named 'cluster_id'.

        Args:
            df: Input DataFrame containing an embeddings column.
            embeddings_column: Name of the column containing embedding vectors.

        Returns:
            The input DataFrame with an additional 'cluster_id' column. Noise points
            are assigned a cluster ID of '-1'.
        """
        embeddings = np.asarray(df[embeddings_column].to_list(), dtype=np.float32)
        coords_for_hdbscan = self._unsupervised_cluster_with_umap(embeddings)
        norm_data = normalize(coords_for_hdbscan, norm="l2")

        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=self.min_cluster_size,
            min_samples=self.min_samples,
            metric="euclidean",
            cluster_selection_method=self.cluster_selection_method,
            cluster_selection_epsilon=self.cluster_selection_epsilon,
            cluster_selection_persistence=0.1,
        )
        labels = clusterer.fit_predict(norm_data)
        df = df.with_columns(cluster_id=pl.Series("cluster_id", labels)).with_columns(
            pl.col("cluster_id").cast(pl.Utf8).alias("cluster_id")
        )

        return df

    @staticmethod
    def _unsupervised_cluster_with_umap(
        embeddings: np.ndarray,
    ) -> np.ndarray:
        """Reduces embedding dimensionality using UMAP for downstream clustering.

        Normalizes the input embeddings with L2 normalization, then applies UMAP to
        project them into a 16-dimensional space suitable for HDBSCAN clustering.

        Args:
            embeddings: High-dimensional embedding vectors to reduce.

        Returns:
            Low-dimensional coordinates suitable for clustering.
        """
        normalized_embeddings = normalize(embeddings, norm="l2")

        umap_reducer = umap.UMAP(
            n_components=16,  # higher values -> less clusters
            n_neighbors=10,  # not so sensitive to this parameter
            min_dist=0.03,
            metric="euclidean",
            random_state=0,
        )
        coords = umap_reducer.fit_transform(normalized_embeddings)
        return coords
