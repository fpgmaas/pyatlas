from dataclasses import dataclass
import umap
import numpy as np
import polars as pl

@dataclass
class ClusterCoordinatesGenerator:
    n_neighbours = 10
    min_dist=0.1
    metric="cosine"

    def generate_coordinates(self, df: pl.DataFrame, embeddings_column: str):
        embeddings = np.asarray(df[embeddings_column].to_list(), dtype=np.float32)
        coordinates = cluster_with_umap(embeddings, n_components=2, n_neighbours=self.n_neighbours, min_dist=self.min_dist, metric=self.metric)
        df = df.with_columns(
            x=coordinates[:, 0],
            y=coordinates[:, 1],
        )
        return df

def cluster_with_umap(embeddings: np.array, n_components: int = 2, n_neighbours: int = 10, min_dist: float=0.1, metric: str = "cosine") -> np.array:

    umap_reducer = umap.UMAP(
        n_components=n_components,
        n_neighbors=n_neighbours,   # smaller -> more, tighter clusters; larger -> smoother
        min_dist=min_dist,     # smaller -> tighter blobs; larger -> more spread
        metric=metric,
        random_state=0,
    )
    coords = umap_reducer.fit_transform(embeddings)
    return coords