import hdbscan

from sklearn.preprocessing import normalize
import numpy as np
import polars as pl
from dataclasses import dataclass
import umap

@dataclass
class ClusterIdGenerator:
    min_cluster_size: int = 8
    min_samples: int = 2
    cluster_selection_method: str = "leaf"
    cluster_selection_epsilon: float = 0.01

    def generate_cluster_ids(self, df: pl.DataFrame, embeddings_column: str):
        embeddings = np.asarray(df[embeddings_column].to_list(), dtype=np.float32)
        coords_for_hdbscan = self._unsupervised_cluster_with_umap(embeddings)
        norm_data = normalize(coords_for_hdbscan, norm="l2")

        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=self.min_cluster_size,
            min_samples=self.min_samples,
            metric="euclidean",
            cluster_selection_method=self.cluster_selection_method,
            cluster_selection_epsilon=self.cluster_selection_epsilon,
        )
        labels = clusterer.fit_predict(norm_data)
        df = df.with_columns(cluster_id=pl.Series("cluster_id", labels)).with_columns(
            pl.col("cluster_id").cast(pl.Utf8).alias("cluster_id")
        )

        return df

    @staticmethod
    def _unsupervised_cluster_with_umap(
        embeddings: np.array,
    ) -> np.array:
        normalized_embeddings = normalize(embeddings, norm="l2")

        umap_reducer = umap.UMAP(
            n_components=10,
            n_neighbors= 10,
            min_dist= 0.1,
            metric="euclidean",
            random_state=0,
        )
        coords = umap_reducer.fit_transform(normalized_embeddings)
        return coords