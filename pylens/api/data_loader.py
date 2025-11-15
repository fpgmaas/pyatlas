import logging
from typing import Tuple

import polars as pl

from pylens.config import Config, StorageBackend
from pylens.utils.blob_io import BlobIO


class ApiDataLoader:
    def __init__(self, config: Config):
        self.config = config

    def load_dataset(self) -> Tuple[pl.DataFrame, pl.DataFrame]:
        if self.config.STORAGE_BACKEND == StorageBackend.LOCAL:
            df_packages, df_embeddings = self._load_local_dataset()
        elif self.config.STORAGE_BACKEND == StorageBackend.BLOB:
            df_packages, df_embeddings = self._load_blob_dataset()
        else:
            raise ValueError(f"Unexpected value found for STORAGE_BACKEND: {self.config.STORAGE_BACKEND}")  # noqa: TRY003

        df_embeddings = self._drop_rows_from_embeddings_that_do_not_appear_in_packages(df_embeddings, df_packages)
        return df_packages, df_embeddings

    def _load_local_dataset(self) -> Tuple[pl.DataFrame, pl.DataFrame]:
        packages_dataset_path = self.config.DATA_DIR / self.config.DATASET_FOR_API_CSV_NAME
        embeddings_dataset_path = self.config.DATA_DIR / self.config.EMBEDDINGS_PARQUET_NAME

        logging.info(f"Reading packages dataset from `{packages_dataset_path}`...")
        df_packages = pl.read_csv(packages_dataset_path)
        self._log_packages_dataset_info(df_packages)

        logging.info(f"Reading embeddings from `{embeddings_dataset_path}`...")
        df_embeddings = pl.read_parquet(embeddings_dataset_path)
        self._log_embeddings_dataset_info(df_embeddings)

        return df_packages, df_embeddings

    def _load_blob_dataset(self) -> Tuple[pl.DataFrame, pl.DataFrame]:
        blob_io = BlobIO(
            self.config.STORAGE_BACKEND_BLOB_ACCOUNT_NAME,
            self.config.STORAGE_BACKEND_BLOB_CONTAINER_NAME,
            self.config.STORAGE_BACKEND_BLOB_KEY,
        )

        logging.info(
            f"Downloading `{self.config.DATASET_FOR_API_CSV_NAME}` from container `{self.config.STORAGE_BACKEND_BLOB_CONTAINER_NAME}`..."
        )
        df_packages = blob_io.download_csv_to_df(self.config.DATASET_FOR_API_CSV_NAME)
        self._log_packages_dataset_info(df_packages)

        logging.info(
            f"Downloading `{self.config.EMBEDDINGS_PARQUET_NAME}` from container `{self.config.STORAGE_BACKEND_BLOB_CONTAINER_NAME}`..."
        )
        df_embeddings = blob_io.download_parquet_to_df(self.config.EMBEDDINGS_PARQUET_NAME)
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
