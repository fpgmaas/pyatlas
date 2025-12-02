import logging

import polars as pl
from dotenv import load_dotenv

from pyatlas.clustering.labeling import ClusterLabeler
from pyatlas.config import Config
from pyatlas.utils.logging import setup_logging


def label_clusters():
    setup_logging()
    load_dotenv()

    config = Config.from_toml()

    # Load the clustered dataset
    clustered_dataset_path = config.storage.data_folder / config.storage.clustered_dataset_csv
    df = pl.read_csv(clustered_dataset_path)

    # Generate cluster metadata/labels
    cluster_labels = ClusterLabeler().generate_cluster_labels(df)

    logging.info(f"Generated metadata for {len(cluster_labels)} clusters")
    logging.info(f"\n{cluster_labels}")

    # Write output
    cluster_labels_path = config.storage.data_folder / config.storage.cluster_labels_csv
    cluster_labels.write_csv(cluster_labels_path)

    logging.info(f"Wrote cluster labels to {cluster_labels_path}")


if __name__ == "__main__":
    setup_logging()
    label_clusters()
