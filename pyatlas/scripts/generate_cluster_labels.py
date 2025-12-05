import logging

import polars as pl
from dotenv import load_dotenv

from pyatlas.clustering.labeling import ClusterLabeler
from pyatlas.config import Config
from pyatlas.utils.logging import setup_logging


def generate_cluster_labels():
    setup_logging()
    load_dotenv()

    config = Config.from_toml()

    clustered_dataset_path = config.storage.data_folder / config.storage.clustered_dataset_csv
    df = pl.read_csv(clustered_dataset_path)

    cluster_labels = ClusterLabeler().generate_cluster_labels(df)

    logging.info(f"Generated labels for {len(cluster_labels)} clusters")
    logging.info(f"\n{cluster_labels}")

    cluster_labels_path = config.storage.data_folder / config.storage.cluster_labels_csv
    cluster_labels.write_csv(cluster_labels_path)

    logging.info(f"Wrote cluster labels to {cluster_labels_path}")


if __name__ == "__main__":
    setup_logging()
    generate_cluster_labels()
