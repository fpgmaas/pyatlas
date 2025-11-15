import os
from dataclasses import dataclass
from enum import Enum
from pathlib import Path


class StorageBackend(Enum):
    LOCAL = "LOCAL"
    BLOB = "BLOB"


@dataclass
class Config:
    # Name of the model used for generating vector embeddings from text.
    # See https://sbert.net/docs/sentence_transformer/pretrained_models.html for available models.
    EMBEDDINGS_MODEL_NAME = "all-mpnet-base-v2"

    # Boolean to overwrite raw data file if it already exists
    OVERWRITE: bool = True

    # Directory where dataset files are stored.
    DATA_DIR: Path = Path("data")

    # Filename for the raw dataset CSV.
    RAW_DATASET_CSV_NAME = "raw_dataset.csv"

    # Filename for the processed dataset CSV.
    PROCESSED_DATASET_CSV_NAME = "processed_dataset.csv"

    # Filename for the dataset that contains the minimal data that the API needs.
    # For example; it needs the name, weekly downloads, and the summary, but not the (cleaned) description.
    DATASET_FOR_API_CSV_NAME = "dataset_for_api.csv"

    # Filename for the dataset that contains the minimal data that the API needs.
    # For example; it needs the name, weekly downloads, and the summary, but not the (cleaned) description.
    EMBEDDINGS_PARQUET_NAME = "embeddings.parquet"

    # Google Drive file ID for downloading the raw dataset.
    GOOGLE_FILE_ID = "1pNdyZ7WP5YImPwzr-AjPX-CDt3ZIzBM2"

    # Fraction of the dataset to include in the vector database. This value determines the portion of top packages
    # (sorted by weekly downloads) to include. Increase this value to include a larger portion of the dataset, up to 1.0 (100%).
    # For reference, a value of 0.25 corresponds to including all PyPI packages with at least approximately 650 weekly downloads
    FRAC_DATA_TO_INCLUDE = 1

    # Weights for the combined score calculation. Higher WEIGHT_SIMILARITY prioritizes
    # relevance based on text similarity, while higher WEIGHT_WEEKLY_DOWNLOADS prioritizes
    # packages with more weekly downloads.
    WEIGHT_SIMILARITY = 0
    WEIGHT_WEEKLY_DOWNLOADS = 1

    # Storage backend configuration. Can be either StorageBackend.LOCAL or StorageBackend.BLOB.
    # If StorageBackend.BLOB, the processed dataset will be uploaded to Blob, and the backend API
    # will read the data from there, rather than from a local data directory. In order to use StorageBackend.BLOB,
    # the other `STORAGE_BACKEND_BLOB_` variables need to be set as environment variables.
    STORAGE_BACKEND: StorageBackend = StorageBackend.LOCAL
    STORAGE_BACKEND_BLOB_ACCOUNT_NAME: str | None = None
    STORAGE_BACKEND_BLOB_CONTAINER_NAME: str | None = None
    STORAGE_BACKEND_BLOB_KEY: str | None = None

    def __post_init__(self) -> None:
        if os.getenv("STORAGE_BACKEND") == "BLOB":
            self.STORAGE_BACKEND = StorageBackend.BLOB
            self.STORAGE_BACKEND_BLOB_ACCOUNT_NAME = os.getenv("STORAGE_BACKEND_BLOB_ACCOUNT_NAME")
            self.STORAGE_BACKEND_BLOB_CONTAINER_NAME = os.getenv("STORAGE_BACKEND_BLOB_CONTAINER_NAME")
            self.STORAGE_BACKEND_BLOB_KEY = os.getenv("STORAGE_BACKEND_BLOB_KEY")

            if not all(
                [
                    self.STORAGE_BACKEND_BLOB_ACCOUNT_NAME,
                    self.STORAGE_BACKEND_BLOB_CONTAINER_NAME,
                    self.STORAGE_BACKEND_BLOB_KEY,
                ]
            ):
                raise OSError("One or more BLOB storage environment variables are missing!")  # noqa: TRY003
