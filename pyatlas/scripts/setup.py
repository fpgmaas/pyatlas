import logging

from pyatlas.scripts.calculate_cluster_labels import calculate_cluster_labels
from pyatlas.scripts.calculate_cluster_metadata import calculate_cluster_metadata
from pyatlas.scripts.create_vector_embeddings import create_vector_embeddings
from pyatlas.scripts.download_raw_dataset import download_raw_dataset
from pyatlas.scripts.generate_clusters import generate_clusters
from pyatlas.scripts.generate_json_outputs import generate_json_outputs
from pyatlas.scripts.process_raw_dataset import process_raw_dataset
from pyatlas.utils.logging import setup_logging


def main():
    setup_logging()

    logging.info("\n\nDOWNLOADING RAW DATASET -------------\n")
    download_raw_dataset()

    logging.info("\n\nPROCESSING RAW DATASET -------------\n")
    process_raw_dataset()

    logging.info("\n\nCREATING VECTOR EMBEDDINGS -------------\n")
    create_vector_embeddings()

    logging.info("\n\nGENERATING CLUSTERS -------------\n")
    generate_clusters()

    logging.info("\n\nCALCULATING CLUSTER LABELS -------------\n")
    calculate_cluster_labels()

    logging.info("\n\nCALCULATING CLUSTER METADATA -------------\n")
    calculate_cluster_metadata()

    logging.info("\n\nGENERATING JSON OUTPUTS -------------\n")
    generate_json_outputs()


if __name__ == "__main__":
    main()
