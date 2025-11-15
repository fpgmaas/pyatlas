import tempfile
from enum import Enum

import polars as pl
from azure.storage.blob import BlobServiceClient


class Format(Enum):
    CSV = "csv"
    PARQUET = "parquet"


class BlobIO:
    def __init__(self, account_name: str, container_name: str, account_key: str):
        self.account_name = account_name
        self.container_name = container_name
        self.account_key = account_key
        self.service_client = BlobServiceClient(
            account_url=f"https://{account_name}.blob.core.windows.net", credential=account_key
        )
        self.container_client = self.service_client.get_container_client(container_name)

    def upload_local_file(self, local_file_path: str, blob_name: str) -> None:
        with open(local_file_path, "rb") as data:
            blob_client = self.container_client.get_blob_client(blob_name)
            blob_client.upload_blob(data, overwrite=True)

    def download_csv_to_df(self, blob_name: str):
        return self._download_as_df(blob_name, Format.CSV)

    def download_parquet_to_df(self, blob_name: str):
        return self._download_as_df(blob_name, Format.PARQUET)

    def _download_as_df(self, blob_name: str, format: Format) -> pl.DataFrame:  # noqa: A002
        """
        //TODO: Improve by not reading into a file first.
        """
        blob_client = self.container_client.get_blob_client(blob_name)
        download_stream = blob_client.download_blob()

        with tempfile.NamedTemporaryFile(delete=True) as temp_file:
            temp_file.write(download_stream.readall())
            temp_file.flush()

            if format == Format.CSV:
                return pl.read_csv(temp_file.name)

            if format == Format.PARQUET:
                return pl.read_parquet(temp_file.name)

    def exists(self, blob_name):
        blob_client = self.container_client.get_blob_client(blob_name)
        return blob_client.exists()

    def download_to_file(self, blob_name: str, local_file_path: str) -> None:
        """Download a blob to a local file path."""
        blob_client = self.container_client.get_blob_client(blob_name)
        with open(local_file_path, "wb") as download_file:
            download_stream = blob_client.download_blob()
            download_file.write(download_stream.readall())
