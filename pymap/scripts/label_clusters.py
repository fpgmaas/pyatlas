import logging

import polars as pl
from dotenv import load_dotenv

from pymap.clustering.labeling import ClusterLabeler
from pymap.config import Config
from pymap.utils.logging import setup_logging


def label_clusters():
    setup_logging()
    load_dotenv()

    config = Config.from_toml()

    # Load the clustered dataset
    clustered_dataset_path = config.storage.data_folder / config.storage.clustered_dataset_csv
    df = pl.read_csv(clustered_dataset_path)

    # Generate cluster metadata/labels
    cluster_metadata = ClusterLabeler().generate_cluster_metadata(df)

    logging.info(f"Generated metadata for {len(cluster_metadata)} clusters")
    logging.info(f"\n{cluster_metadata}")

    # Write output
    cluster_metadata_path = config.storage.data_folder / config.storage.cluster_metadata_csv
    cluster_metadata.write_csv(cluster_metadata_path)

    logging.info(f"Wrote cluster metadata to {cluster_metadata_path}")


if __name__ == "__main__":
    setup_logging()
    label_clusters()
