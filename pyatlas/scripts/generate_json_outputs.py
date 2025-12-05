import json
import logging

import polars as pl
from dotenv import load_dotenv

from pyatlas.config import Config
from pyatlas.utils.logging import setup_logging


def generate_json_outputs():
    setup_logging()
    load_dotenv()

    config = Config.from_toml()

    # Load the source CSVs
    clustered_dataset_path = config.storage.data_folder / config.storage.clustered_dataset_csv
    cluster_metadata_path = config.storage.data_folder / config.storage.cluster_metadata_csv
    cluster_labels_path = config.storage.data_folder / config.storage.cluster_labels_csv

    df_packages = pl.read_csv(clustered_dataset_path)
    df_clusters = pl.read_csv(cluster_metadata_path)
    df_cluster_labels = pl.read_csv(cluster_labels_path)

    df_clusters = df_cluster_labels.join(df_clusters, on="cluster_id", how="outer")

    # Generate packages.json
    packages = []
    for idx, row in enumerate(df_packages.iter_rows(named=True)):
        packages.append(
            {
                "id": idx,
                "name": row["name"],
                "summary": row["summary"],
                "downloads": row["weekly_downloads"],
                "x": row["x"],
                "y": row["y"],
                "clusterId": row["cluster_id"],
            }
        )

    # Generate clusters.json
    clusters = []
    for row in df_clusters.iter_rows(named=True):
        clusters.append(
            {
                "clusterId": row["cluster_id"],
                "label": row["cluster_label"],
                "centroidX": row["centroid_x"],
                "centroidY": row["centroid_y"],
                "downloads": row["total_weekly_downloads"],
                "minX": row["min_x"],
                "maxX": row["max_x"],
                "minY": row["min_y"],
                "maxY": row["max_y"],
            }
        )

    # Write output files
    packages_json_path = config.storage.data_folder / config.storage.packages_json
    clusters_json_path = config.storage.data_folder / config.storage.clusters_json

    with open(packages_json_path, "w") as f:
        json.dump(packages, f, indent=2)

    with open(clusters_json_path, "w") as f:
        json.dump(clusters, f, indent=2)

    logging.info(f"Generated packages.json with {len(packages)} packages")
    logging.info(f"Wrote packages to {packages_json_path}")
    logging.info(f"Generated clusters.json with {len(clusters)} clusters")
    logging.info(f"Wrote clusters to {clusters_json_path}")


if __name__ == "__main__":
    setup_logging()
    generate_json_outputs()
