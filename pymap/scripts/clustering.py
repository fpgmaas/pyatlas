import logging
from pathlib import Path

import polars as pl
from dotenv import load_dotenv

from pymap.config import Config
from pymap.utils.logging import setup_logging
import numpy as np

from pymap.clustering.coordinates import ClusterCoordinatesGenerator
from pymap.clustering.clustering import ClusterIdGenerator

def get_dataset(processed_dataset_csv: Path, embeddings_parquet: Path):
    df_embeddings = pl.read_parquet(embeddings_parquet, columns=["name", "embeddings"])
    df_meta = pl.read_csv(processed_dataset_csv, columns=["name", "weekly_downloads", "summary"])
    df_joined = df_embeddings.join(df_meta, on="name", how="left")
    df = df_joined.sort("weekly_downloads",descending=True)
    return df


def create_vector_embeddings():
    setup_logging()
    load_dotenv()

    config = Config.from_toml()

    df = get_dataset(config.storage.data_folder / config.storage.processed_dataset_csv, 
                     config.storage.data_folder / config.storage.embeddings_parquet)

    df = ClusterCoordinatesGenerator().generate_coordinates(df, "embeddings")
    df = ClusterIdGenerator().generate_cluster_ids(df, "embeddings")



if __name__ == "__main__":
    setup_logging()
    create_vector_embeddings()
