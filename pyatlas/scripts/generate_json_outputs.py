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

    clustered_dataset_path = config.storage.data_folder / config.storage.clustered_dataset_csv
    cluster_metadata_path = config.storage.data_folder / config.storage.cluster_metadata_csv
    cluster_labels_path = config.storage.data_folder / config.storage.cluster_labels_csv
    constellations_path = config.storage.data_folder / config.storage.constellations_csv

    df_packages = pl.read_csv(clustered_dataset_path)
    df_clusters = pl.read_csv(cluster_metadata_path)
    df_cluster_labels = pl.read_csv(cluster_labels_path)
    df_constellations = pl.read_csv(constellations_path)

    df_clusters = df_cluster_labels.join(df_clusters, on="cluster_id", how="outer")

    packages = []
    package_name_to_id = {}
    for idx, row in enumerate(df_packages.iter_rows(named=True)):
        package_name_to_id[row["name"]] = idx
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

    constellations = []
    for row in df_constellations.iter_rows(named=True):
        from_id = package_name_to_id.get(row["from_package"])
        to_id = package_name_to_id.get(row["to_package"])
        if from_id is not None and to_id is not None:
            constellations.append(
                {
                    "clusterId": row["cluster_id"],
                    "fromId": from_id,
                    "toId": to_id,
                    "fromX": row["from_x"],
                    "fromY": row["from_y"],
                    "toX": row["to_x"],
                    "toY": row["to_y"],
                }
            )

    packages_json_path = config.storage.data_folder / config.storage.packages_json
    clusters_json_path = config.storage.data_folder / config.storage.clusters_json
    constellations_json_path = config.storage.data_folder / config.storage.constellations_json

    with open(packages_json_path, "w") as f:
        json.dump(packages, f, indent=2)

    with open(clusters_json_path, "w") as f:
        json.dump(clusters, f, indent=2)

    with open(constellations_json_path, "w") as f:
        json.dump(constellations, f, indent=2)

    logging.info(f"Generated packages.json with {len(packages)} packages")
    logging.info(f"Wrote packages to {packages_json_path}")
    logging.info(f"Generated clusters.json with {len(clusters)} clusters")
    logging.info(f"Wrote clusters to {clusters_json_path}")
    logging.info(f"Generated constellations.json with {len(constellations)} edges")
    logging.info(f"Wrote star signs to {constellations_json_path}")


if __name__ == "__main__":
    setup_logging()
    generate_json_outputs()
