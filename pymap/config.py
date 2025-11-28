"""
Simplified configuration for the PyLens project.
Loads defaults with optional .env overrides—no TOML files or per-environment modes.
"""

from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppConfig(BaseSettings):
    """Application metadata."""

    name: str = "pymap"
    version: str = "0.0.1"
    description: str = "PyMap creates a map of python packages."
    embeddings_model_name: str = "all-mpnet-base-v2"

    model_config = SettingsConfigDict(env_file=(".env",), env_prefix="PYMAP_APP__", extra="ignore")


class StorageConfig(BaseSettings):
    """Storage configuration for blob storage and local cache."""

    data_folder: Path = Path("data")
    raw_dataset_csv: str = "raw_dataset.csv"
    processed_dataset_csv: str = "processed_dataset.csv"
    dataset_for_api_csv: str = "dataset_for_api.csv"
    embeddings_parquet: str = "embeddings.parquet"

    model_config = SettingsConfigDict(env_file=(".env",), env_prefix="PYMAP_STORAGE__", extra="ignore")


class ETLConfig(BaseSettings):
    """ETL pipeline configuration."""

    google_file_id: str = "1pNdyZ7WP5YImPwzr-AjPX-CDt3ZIzBM2"
    overwrite_download: bool = True
    top_packages_to_include: int = 1000

    model_config = SettingsConfigDict(env_file=(".env",), env_prefix="PYMAP_ETL__", extra="ignore")


class Config(BaseSettings):
    """Main configuration container."""

    app: AppConfig = Field(default_factory=AppConfig)
    storage: StorageConfig = Field(default_factory=StorageConfig)
    etl: ETLConfig = Field(default_factory=ETLConfig)

    @classmethod
    @lru_cache(maxsize=1)
    def load(cls) -> "Config":
        """Load configuration from environment (with .env support)."""
        return cls()

    @classmethod
    def from_toml(cls, *_args, **_kwargs) -> "Config":
        """Backward-compatible loader that now just uses environment variables."""
        return cls.load()

    def dump(self) -> dict:
        """Return config as dict (for debugging)."""
        return {
            "app": self.app.model_dump(),
            "storage": self.storage.model_dump(),
            "etl": self.etl.model_dump(),
        }

    model_config = SettingsConfigDict(env_file=(".env",), env_prefix="PYMAP__", extra="ignore")

# Global config instance
config = Config.load()

if __name__ == "__main__":
    from pprint import pprint

    pprint(config.dump())
