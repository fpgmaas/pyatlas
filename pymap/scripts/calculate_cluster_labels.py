import logging

import polars as pl
from dotenv import load_dotenv

from pymap.clustering.labeling import ClusterLabeler
from pymap.config import Config
from pymap.utils.logging import setup_logging


def calculate_cluster_labels():
    setup_logging()
    load_dotenv()

    config = Config.from_toml()

    # Load the clustered dataset
    clustered_dataset_path = config.storage.data_folder / config.storage.clustered_dataset_csv
    df = pl.read_csv(clustered_dataset_path)

    # Generate cluster labels using OpenAI
    cluster_labels = ClusterLabeler().generate_cluster_labels(df)

    logging.info(f"Generated labels for {len(cluster_labels)} clusters")
    logging.info(f"\n{cluster_labels}")

    # Write output
    cluster_labels_path = config.storage.data_folder / config.storage.cluster_labels_csv
    cluster_labels.write_csv(cluster_labels_path)

    logging.info(f"Wrote cluster labels to {cluster_labels_path}")


if __name__ == "__main__":
    setup_logging()
    calculate_cluster_labels()
