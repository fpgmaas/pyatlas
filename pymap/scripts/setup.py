import logging

from pymap.scripts.create_vector_embeddings import create_vector_embeddings
from pymap.scripts.download_raw_dataset import download_raw_dataset
from pymap.scripts.process_raw_dataset import process_raw_dataset
from pymap.utils.logging import setup_logging


def main():
    setup_logging()

    logging.info("\n\nDOWNLOADING RAW DATASET -------------\n")
    download_raw_dataset()

    logging.info("\n\nPROCESSING RAW DATASET -------------\n")
    process_raw_dataset()

    logging.info("\n\nCREATING VECTOR EMBEDDINGS -------------\n")
    create_vector_embeddings()


if __name__ == "__main__":
    main()
