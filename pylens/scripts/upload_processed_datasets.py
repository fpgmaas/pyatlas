import logging

from dotenv import load_dotenv

from pylens.config import Config
from pylens.utils.blob_io import BlobIO
from pylens.utils.logging import setup_logging


def upload_processed_datasets():
    load_dotenv()
    config = Config.from_toml()

    file_names = [config.files.processed_dataset_csv, config.files.dataset_for_api_csv, config.files.embeddings_parquet]

    blob_io = BlobIO(
        config.storage.blob_account_name,
        config.storage.blob_container_name,
        config.storage.blob_account_key,
    )

    for file_name in file_names:
        logging.info(f"💫 Uploading {file_name} to blob container `{config.storage.blob_container_name}`...")
        blob_io.upload_local_file(config.storage.data_folder / file_name, file_name)

    logging.info("✅ Done!")


if __name__ == "__main__":
    setup_logging()
    upload_processed_datasets()
