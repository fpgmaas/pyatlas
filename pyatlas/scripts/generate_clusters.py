import logging
import random
from pathlib import Path

import polars as pl
from dotenv import load_dotenv

from pyatlas.clustering.clustering import ClusterIdGenerator
from pyatlas.clustering.coordinates import ClusterCoordinatesGenerator
from pyatlas.config import Config
from pyatlas.utils.logging import setup_logging


def get_dataset(processed_dataset_csv: Path, embeddings_parquet: Path):
    df_embeddings = pl.read_parquet(embeddings_parquet, columns=["name", "embeddings"])
    df_meta = pl.read_csv(processed_dataset_csv, columns=["name", "weekly_downloads", "summary"])
    df_joined = df_embeddings.join(df_meta, on="name", how="left")
    df = df_joined.sort("weekly_downloads", descending=True)
    return df


def generate_clusters():
    setup_logging()
    load_dotenv()
    random.seed(1234)

    config = Config.from_toml()

    df = get_dataset(
        config.storage.data_folder / config.storage.processed_dataset_csv,
        config.storage.data_folder / config.storage.embeddings_parquet,
    )

    df = ClusterIdGenerator().generate_cluster_ids(df, "embeddings")
    df = ClusterCoordinatesGenerator().generate_coordinates(df, "embeddings", "cluster_id")

    clustered_dataset_path = config.storage.data_folder / config.storage.clustered_dataset_csv

    df = df.drop("embeddings")
    df.write_csv(clustered_dataset_path)

    logging.info(f"Generated {df['cluster_id'].n_unique()} clusters")
    logging.info(f"Number of points not belonging to a cluster; {len(df.filter(pl.col('cluster_id') == '-1'))}")
    logging.info(f"Wrote clustered dataset to {clustered_dataset_path}")


if __name__ == "__main__":
    setup_logging()
    generate_clusters()
