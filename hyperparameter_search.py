"""Grid search over ClusterIdGenerator hyperparameters."""

import csv
import itertools
import logging
import random
from datetime import datetime
from pathlib import Path

import hdbscan
import numpy as np
import polars as pl
from dotenv import load_dotenv
from sklearn.preprocessing import normalize
import umap

from pyatlas.config import Config
from pyatlas.utils.logging import setup_logging


def get_dataset(processed_dataset_csv: Path, embeddings_parquet: Path):
    df_embeddings = pl.read_parquet(embeddings_parquet, columns=["name", "embeddings"])
    df_meta = pl.read_csv(processed_dataset_csv, columns=["name", "weekly_downloads", "summary"])
    df_joined = df_embeddings.join(df_meta, on="name", how="left")
    df = df_joined.sort("weekly_downloads", descending=True)
    return df


def run_clustering(
    embeddings: np.ndarray,
    n_components: int,
    n_neighbors: int,
    min_dist: float,
    cluster_selection_epsilon: float,
    min_cluster_size: int = 8,
    min_samples: int = 2,
) -> tuple[int, int]:
    """Run UMAP + HDBSCAN clustering and return (n_clusters, n_unclustered)."""
    # UMAP dimensionality reduction
    normalized_embeddings = normalize(embeddings, norm="l2")
    umap_reducer = umap.UMAP(
        n_components=n_components,
        n_neighbors=n_neighbors,
        min_dist=min_dist,
        metric="euclidean",
        random_state=0,
    )
    coords = umap_reducer.fit_transform(normalized_embeddings)

    # HDBSCAN clustering
    norm_data = normalize(coords, norm="l2")
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=min_cluster_size,
        min_samples=min_samples,
        metric="euclidean",
        cluster_selection_method="eom",
        cluster_selection_epsilon=cluster_selection_epsilon,
    )
    labels = clusterer.fit_predict(norm_data)

    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_unclustered = (labels == -1).sum()

    return n_clusters, n_unclustered


def main():
    setup_logging()
    load_dotenv()
    random.seed(1234)

    config = Config.from_toml()

    logging.info("Loading dataset...")
    df = get_dataset(
        config.storage.data_folder / config.storage.processed_dataset_csv,
        config.storage.data_folder / config.storage.embeddings_parquet,
    )
    embeddings = np.asarray(df["embeddings"].to_list(), dtype=np.float32)
    logging.info(f"Loaded {len(embeddings)} embeddings")

    # Parameter grid
    param_grid = {
        "n_components": [16],
        "n_neighbors": [10, 16],
        "min_dist": [0.03, 0.05, 0.08],
        "cluster_selection_epsilon": [0.0075, 0.01, 0.0125],
    }

    # Generate all combinations
    keys = list(param_grid.keys())
    combinations = list(itertools.product(*param_grid.values()))
    total = len(combinations)

    logging.info(f"Running grid search over {total} parameter combinations...")

    # CSV output
    output_file = Path("hyperparameter_results.csv")
    file_exists = output_file.exists()

    with open(output_file, "a", newline="") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["timestamp", *keys, "n_clusters", "n_unclustered"])

        for i, values in enumerate(combinations, 1):
            params = dict(zip(keys, values))
            logging.info(f"[{i}/{total}] Running with {params}")

            n_clusters, n_unclustered = run_clustering(embeddings, **params)

            logging.info(f"  -> {n_clusters} clusters, {n_unclustered} unclustered points")

            writer.writerow([
                datetime.now().isoformat(),
                *values,
                n_clusters,
                n_unclustered,
            ])
            f.flush()

    logging.info(f"Results written to {output_file}")


if __name__ == "__main__":
    main()
