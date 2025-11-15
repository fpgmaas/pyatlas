import logging

from dotenv import load_dotenv

from pylens.config import Config, StorageBackend
from pylens.utils.blob_io import BlobIO
from pylens.utils.logging import setup_logging


def upload_processed_datasets():
    load_dotenv()
    config = Config()

    if config.STORAGE_BACKEND != StorageBackend.BLOB:
        logging.info(
            "Not using BLOB backend. Skipping upload. To enable, configure the `STORAGE_BACKEND_` variables in config"
        )
        return

    file_names = [config.PROCESSED_DATASET_CSV_NAME, config.DATASET_FOR_API_CSV_NAME, config.EMBEDDINGS_PARQUET_NAME]

    blob_io = BlobIO(
        config.STORAGE_BACKEND_BLOB_ACCOUNT_NAME,
        config.STORAGE_BACKEND_BLOB_CONTAINER_NAME,
        config.STORAGE_BACKEND_BLOB_KEY,
    )

    for file_name in file_names:
        logging.info(f"💫 Uploading {file_name} to blob container `{config.STORAGE_BACKEND_BLOB_CONTAINER_NAME}`...")
        blob_io.upload_local_file(config.DATA_DIR / file_name, file_name)

    logging.info("✅ Done!")


if __name__ == "__main__":
    setup_logging()
    upload_processed_datasets()
