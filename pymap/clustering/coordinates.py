from dataclasses import dataclass

import numpy as np
import polars as pl
import umap
from sklearn.preprocessing import normalize


@dataclass
class ClusterCoordinatesGenerator:
    n_neighbours = 10
    min_dist = 0.1
    metric = "euclidean"

    def generate_coordinates(self, df: pl.DataFrame, embeddings_column: str):
        embeddings = np.asarray(df[embeddings_column].to_list(), dtype=np.float32)

        coordinates = cluster_with_umap(
            embeddings, n_components=2, n_neighbours=self.n_neighbours, min_dist=self.min_dist, metric=self.metric
        )

        # To reduce empty space in the plot in two dimensions. Otherwise a single outlier group squashes the
        # others together visually.
        coordinates = self._log_radius_scale(coordinates)
        df = df.with_columns(
            x=coordinates[:, 0],
            y=coordinates[:, 1],
        )
        return df

    @staticmethod
    def _log_radius_scale(coords: np.ndarray) -> np.ndarray:
        center = np.median(coords, axis=0)
        centered = coords - center

        r = np.linalg.norm(centered, axis=1)
        r_safe = np.where(r == 0, 1e-8, r)

        r_log = np.log1p(r)  # grows like log instead of linear
        factor = r_log / r_safe

        scaled = centered * factor[:, None]
        return scaled + center


def cluster_with_umap(
    embeddings: np.array,
    n_components: int = 2,
    n_neighbours: int = 10,
    min_dist: float = 0.1,
    metric: str = "euclidean",
) -> np.array:
    normalized_embeddings = normalize(embeddings, norm="l2")

    umap_reducer = umap.UMAP(
        n_components=n_components,
        n_neighbors=n_neighbours,  # smaller -> more, tighter clusters; larger -> smoother
        min_dist=min_dist,  # smaller -> tighter blobs; larger -> more spread
        metric=metric,
        random_state=0,
    )
    coords = umap_reducer.fit_transform(normalized_embeddings)
    return coords
