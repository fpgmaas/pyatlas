import logging

import polars as pl
from dotenv import load_dotenv

from pyatlas.clustering.constellations import ClusterConstellationsGenerator
from pyatlas.config import Config
from pyatlas.utils.logging import setup_logging


def calculate_constellations():
    setup_logging()
    load_dotenv()

    config = Config.from_toml()

    clustered_dataset_path = config.storage.data_folder / config.storage.clustered_dataset_csv
    df = pl.read_csv(clustered_dataset_path)

    constellations = ClusterConstellationsGenerator().generate_constellations(df)

    logging.info(f"Generated {len(constellations)} constellation edges across all clusters")
    logging.info(f"\n{constellations}")

    constellations_path = config.storage.data_folder / config.storage.constellations_csv
    constellations.write_csv(constellations_path)

    logging.info(f"Wrote star signs to {constellations_path}")


if __name__ == "__main__":
    setup_logging()
    calculate_constellations()
