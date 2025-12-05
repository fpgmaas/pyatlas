from dataclasses import dataclass

import numpy as np
import polars as pl
import umap
from sklearn.preprocessing import normalize


@dataclass
class ClusterCoordinatesGenerator:
    """Generates 2D coordinates for visualizing clustered embeddings.

    Uses supervised UMAP to project high-dimensional embeddings into 2D space,
    leveraging cluster labels to improve separation between clusters. Applies
    logarithmic radius scaling to prevent outliers from compressing the visualization.
    """

    def generate_coordinates(self, df: pl.DataFrame, embeddings_column: str, cluster_id_column: str):
        """Computes 2D visualization coordinates for each row in the DataFrame.

        Projects embeddings into 2D using supervised UMAP with cluster labels, then
        applies logarithmic scaling to improve visual distribution of points.

        Args:
            df: Input DataFrame containing embeddings and cluster IDs.
            embeddings_column: Name of the column containing embedding vectors.
            cluster_id_column: Name of the column containing cluster ID labels.

        Returns:
            The input DataFrame with additional 'x' and 'y' columns for 2D coordinates.
        """
        embeddings = np.asarray(df[embeddings_column].to_list(), dtype=np.float32)
        cluster_ids = np.asarray(df[cluster_id_column].to_list(), dtype=np.int16)

        coordinates = self._supervised_cluster_with_umap(embeddings, cluster_ids)

        # To reduce empty space in the plot in two dimensions. Otherwise a single outlier group squashes the
        # others together visually.
        coordinates = self._log_radius_scale(coordinates)
        df = df.with_columns(
            x=pl.Series(coordinates[:, 0]),
            y=pl.Series(coordinates[:, 1]),
        )
        return df

    @staticmethod
    def _log_radius_scale(coords: np.ndarray) -> np.ndarray:
        """Applies logarithmic scaling to radial distances from the center.

        Compresses distances logarithmically to prevent outlier clusters from
        squashing the main visualization into a small area.
        """
        center = np.median(coords, axis=0)
        centered = coords - center

        r = np.linalg.norm(centered, axis=1)
        r_safe = np.where(r == 0, 1e-8, r)

        r_log = np.log1p(r)  # grows like log instead of linear
        factor = r_log / r_safe

        scaled = centered * factor[:, None]
        return scaled + center

    @staticmethod
    def _supervised_cluster_with_umap(embeddings: np.ndarray, cluster_ids: np.ndarray) -> np.ndarray:
        """Projects embeddings to 2D using supervised UMAP with cluster labels."""
        normalized_embeddings = normalize(embeddings, norm="l2")

        umap_reducer = umap.UMAP(
            n_components=2,
            n_neighbors=12,
            min_dist=0.6,
            repulsion_strength=0.3,
            metric="euclidean",
            random_state=0,
            target_weight=0.5,
            spread=0.7,
        )
        coords = umap_reducer.fit_transform(normalized_embeddings, y=cluster_ids)
        return coords
