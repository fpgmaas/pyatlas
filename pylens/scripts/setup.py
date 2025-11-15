import logging

from pylens.scripts.create_vector_embeddings import create_vector_embeddings
from pylens.scripts.download_raw_dataset import download_raw_dataset
from pylens.scripts.process_raw_dataset import process_raw_dataset
from pylens.scripts.upload_processed_datasets import upload_processed_datasets
from pylens.utils.logging import setup_logging


def main():
    setup_logging()

    logging.info("\n\nDOWNLOADING RAW DATASET -------------\n")
    download_raw_dataset()

    logging.info("\n\nPROCESSING RAW DATASET -------------\n")
    process_raw_dataset()

    logging.info("\n\nCREATING VECTOR EMBEDDINGS -------------\n")
    create_vector_embeddings()

    logging.info("\n\nUPLOADING PROCESSED DATASETS -------------\n")
    upload_processed_datasets()


if __name__ == "__main__":
    main()
