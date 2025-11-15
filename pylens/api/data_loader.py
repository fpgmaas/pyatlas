import logging
from typing import Tuple

import polars as pl

from pylens.config import Config
from pylens.utils.blob_io import BlobIO


class ApiDataLoader:
    def __init__(self, config: Config):
        self.config = config

    def load_dataset(self) -> Tuple[pl.DataFrame, pl.DataFrame]:
        """
        Load datasets from blob storage with local caching.

        In prod: always download from blob on startup (force_download_on_startup=True)
        In dev: skip download if files exist locally (force_download_on_startup=False)
        """
        # Ensure data directory exists
        self.config.storage.data_folder.mkdir(parents=True, exist_ok=True)

        # Download files from blob if needed
        self._download_from_blob_if_needed()

        # Load from local cache
        df_packages, df_embeddings = self._load_from_local_cache()

        df_embeddings = self._drop_rows_from_embeddings_that_do_not_appear_in_packages(df_embeddings, df_packages)
        return df_packages, df_embeddings

    def _download_from_blob_if_needed(self) -> None:
        """Download datasets from blob storage if needed based on config."""
        packages_path = self.config.storage.data_folder / self.config.files.dataset_for_api_csv
        embeddings_path = self.config.storage.data_folder / self.config.files.embeddings_parquet

        # Check if we need to download
        files_exist = packages_path.exists() and embeddings_path.exists()
        should_download = self.config.storage.force_download_on_startup or not files_exist

        if not should_download:
            logging.info("Files exist locally and force_download_on_startup=False, skipping download from blob")
            return

        # Download from blob
        blob_io = BlobIO(
            self.config.storage.blob_account_name,
            self.config.storage.blob_container_name,
            self.config.storage.blob_account_key,
        )

        logging.info(
            f"Downloading `{self.config.files.dataset_for_api_csv}` from blob container "
            f"`{self.config.storage.blob_container_name}` to `{packages_path}`..."
        )
        blob_io.download_to_file(self.config.files.dataset_for_api_csv, str(packages_path))

        logging.info(
            f"Downloading `{self.config.files.embeddings_parquet}` from blob container "
            f"`{self.config.storage.blob_container_name}` to `{embeddings_path}`..."
        )
        blob_io.download_to_file(self.config.files.embeddings_parquet, str(embeddings_path))

        logging.info("Finished downloading files from blob storage")

    def _load_from_local_cache(self) -> Tuple[pl.DataFrame, pl.DataFrame]:
        """Load datasets from local cache directory."""
        packages_path = self.config.storage.data_folder / self.config.files.dataset_for_api_csv
        embeddings_path = self.config.storage.data_folder / self.config.files.embeddings_parquet

        logging.info(f"Reading packages dataset from `{packages_path}`...")
        df_packages = pl.read_csv(packages_path)
        self._log_packages_dataset_info(df_packages)

        logging.info(f"Reading embeddings from `{embeddings_path}`...")
        df_embeddings = pl.read_parquet(embeddings_path)
        self._log_embeddings_dataset_info(df_embeddings)

        return df_packages, df_embeddings

    @staticmethod
    def _log_packages_dataset_info(df_packages: pl.DataFrame) -> None:
        logging.info(f"Finished loading the `packages` dataset. Number of rows in dataset: {len(df_packages):,}")
        logging.info(df_packages.describe())

    @staticmethod
    def _log_embeddings_dataset_info(df_embeddings: pl.DataFrame) -> None:
        logging.info(f"Finished loading the `embeddings` dataset. Number of rows in dataset: {len(df_embeddings):,}")
        logging.info(df_embeddings.describe())

    @staticmethod
    def _drop_rows_from_embeddings_that_do_not_appear_in_packages(df_embeddings, df_packages):
        # We only keep the packages in the vector dataset that also occur in the packages dataset.
        # In theory, this should never drop something. But still good to keep as a fail-safe to prevent issues in the API.
        logging.info("Dropping packages in the `embeddings` dataset that do not occur in the `packages` dataset...")
        logging.info(f"Number of rows before dropping: {len(df_embeddings):,}...")
        df_embeddings = df_embeddings.join(df_packages, on="name", how="semi")
        logging.info(f"Number of rows after dropping: {len(df_embeddings):,}...")
        return df_embeddings
