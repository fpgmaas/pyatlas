"""
Unified configuration system for the PyLens project.
Supports dev and prod environments with TOML and .env variable overrides.
"""

import os
from enum import Enum
from functools import lru_cache
from pathlib import Path

import tomllib
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# ─────────────────────────────────────────────────────────────────────────────
# Environments
# ─────────────────────────────────────────────────────────────────────────────


class Environment(str, Enum):
    DEV = "dev"
    PROD = "prod"


# ─────────────────────────────────────────────────────────────────────────────
# Storage Config
# ─────────────────────────────────────────────────────────────────────────────


class StorageConfig(BaseSettings):
    """Storage configuration for blob storage."""

    # Local data directory (used as cache for downloaded blob files)
    data_folder: Path = Path("data")

    # Blob storage credentials - all required
    blob_account_name: str
    blob_container_name: str
    blob_account_key: str

    # Force download from blob on API startup (prod=True, dev=False)
    force_download_on_startup: bool = False

    model_config = SettingsConfigDict(env_file=(".env",), env_prefix="PYLENS_STORAGE__", extra="ignore")

    @model_validator(mode="after")
    def validate_blob_credentials(self):
        """Ensure all blob credentials are provided."""
        if not all([self.blob_account_name, self.blob_container_name, self.blob_account_key]):
            raise ValueError(
                "All blob storage credentials must be provided (account_name, container_name, account_key)"
            )
        return self


# ─────────────────────────────────────────────────────────────────────────────
# ETL Config
# ─────────────────────────────────────────────────────────────────────────────


class ETLConfig(BaseSettings):
    """ETL pipeline configuration."""

    # Google Drive file ID for downloading the raw dataset
    google_file_id: str = "1pNdyZ7WP5YImPwzr-AjPX-CDt3ZIzBM2"

    # Boolean to overwrite raw data file if it already exists
    overwrite_download: bool = True

    # Fraction of the dataset to include in the vector database
    # 1.0 = 100% of packages (all packages)
    # 0.25 = top 25% by weekly downloads (packages with ~650+ weekly downloads)
    frac_data_to_include: float = 1.0

    model_config = SettingsConfigDict(env_file=(".env",), env_prefix="PYLENS_ETL__", extra="ignore")


# ─────────────────────────────────────────────────────────────────────────────
# API Config
# ─────────────────────────────────────────────────────────────────────────────


class APIConfig(BaseSettings):
    """API server configuration."""

    host: str = "0.0.0.0"  # noqa: S104
    port: int = 8080
    debug: bool = False

    cors_origins: list[str] = ["http://localhost:3000"]  # noqa: RUF012

    # Model name for generating vector embeddings from text
    # See https://sbert.net/docs/sentence_transformer/pretrained_models.html
    embeddings_model_name: str = "all-mpnet-base-v2"

    # Weights for the combined score calculation
    # Higher weight_similarity prioritizes text relevance
    # Higher weight_weekly_downloads prioritizes popular packages
    weight_similarity: float = 0.0
    weight_weekly_downloads: float = 1.0

    model_config = SettingsConfigDict(env_file=(".env",), env_prefix="PYLENS_API__", extra="ignore")


# ─────────────────────────────────────────────────────────────────────────────
# App Config
# ─────────────────────────────────────────────────────────────────────────────


class AppConfig(BaseSettings):
    """Application metadata and environment."""

    name: str = "pylens"
    version: str = "0.0.1"
    description: str = "PyLens helps you find PyPI packages through natural language prompts"

    environment: Environment = Field(
        default_factory=lambda: Environment(os.getenv("PYLENS_ENV", Environment.DEV.value))
    )

    model_config = SettingsConfigDict(env_file=(".env",), env_prefix="PYLENS_APP__", extra="ignore")


# ─────────────────────────────────────────────────────────────────────────────
# Data Files Config
# ─────────────────────────────────────────────────────────────────────────────


class DataFilesConfig(BaseSettings):
    """Configuration for data file names."""

    raw_dataset_csv: str = "raw_dataset.csv"
    processed_dataset_csv: str = "processed_dataset.csv"
    dataset_for_api_csv: str = "dataset_for_api.csv"
    embeddings_parquet: str = "embeddings.parquet"

    model_config = SettingsConfigDict(env_file=(".env",), env_prefix="PYLENS_FILES__", extra="ignore")


# ─────────────────────────────────────────────────────────────────────────────
# Unified Config Loader
# ─────────────────────────────────────────────────────────────────────────────


class Config(BaseSettings):
    """Main configuration container."""

    app: AppConfig = Field(default_factory=AppConfig)
    storage: StorageConfig = Field(default_factory=StorageConfig)
    etl: ETLConfig = Field(default_factory=ETLConfig)
    api: APIConfig = Field(default_factory=APIConfig)
    files: DataFilesConfig = Field(default_factory=DataFilesConfig)

    @classmethod
    @lru_cache(maxsize=1)
    def from_toml(cls, config_path: Path | None = None, environment: Environment | None = None) -> "Config":
        """
        Load configuration from a TOML file with environment-specific overrides.
        Priority:
        - `environment` param
        - PYLENS_ENV env var
        - Default to "dev"
        """
        # Determine the environment
        if environment is None:
            env_str = os.getenv("PYLENS_ENV", Environment.DEV.value)
            environment = Environment(env_str)

        # Detect config file
        if config_path is None:
            config_path = Path(f"config.{environment.value}.toml")
            if not config_path.exists():
                config_path = Path("config.toml")

        config_data = {}
        if config_path.exists():
            with open(config_path, "rb") as f:
                config_data = tomllib.load(f)

        # Inject environment explicitly into app config
        app_config = config_data.get("app", {})
        app_config["environment"] = environment.value

        return cls(
            app=AppConfig(**app_config),
            storage=StorageConfig(**config_data.get("storage", {})),
            etl=ETLConfig(**config_data.get("etl", {})),
            api=APIConfig(**config_data.get("api", {})),
            files=DataFilesConfig(**config_data.get("files", {})),
        )

    @property
    def is_dev(self) -> bool:
        return self.app.environment == Environment.DEV

    @property
    def is_prod(self) -> bool:
        return self.app.environment == Environment.PROD

    # Convenience properties for backward compatibility
    @property
    def DATA_DIR(self) -> Path:
        """Legacy property for data directory."""
        return self.storage.data_folder

    @property
    def RAW_DATASET_CSV_NAME(self) -> str:
        """Legacy property for raw dataset filename."""
        return self.files.raw_dataset_csv

    @property
    def PROCESSED_DATASET_CSV_NAME(self) -> str:
        """Legacy property for processed dataset filename."""
        return self.files.processed_dataset_csv

    @property
    def DATASET_FOR_API_CSV_NAME(self) -> str:
        """Legacy property for API dataset filename."""
        return self.files.dataset_for_api_csv

    @property
    def EMBEDDINGS_PARQUET_NAME(self) -> str:
        """Legacy property for embeddings filename."""
        return self.files.embeddings_parquet

    @property
    def EMBEDDINGS_MODEL_NAME(self) -> str:
        """Legacy property for embeddings model name."""
        return self.api.embeddings_model_name

    @property
    def GOOGLE_FILE_ID(self) -> str:
        """Legacy property for Google Drive file ID."""
        return self.etl.google_file_id

    @property
    def OVERWRITE(self) -> bool:
        """Legacy property for overwrite flag."""
        return self.etl.overwrite_download

    @property
    def FRAC_DATA_TO_INCLUDE(self) -> float:
        """Legacy property for data fraction."""
        return self.etl.frac_data_to_include

    @property
    def WEIGHT_SIMILARITY(self) -> float:
        """Legacy property for similarity weight."""
        return self.api.weight_similarity

    @property
    def WEIGHT_WEEKLY_DOWNLOADS(self) -> float:
        """Legacy property for weekly downloads weight."""
        return self.api.weight_weekly_downloads

    def dump(self) -> dict:
        """Return config as dict (for debugging)."""
        return {
            "app": self.app.model_dump(),
            "storage": self.storage.model_dump(),
            "etl": self.etl.model_dump(),
            "api": self.api.model_dump(),
            "files": self.files.model_dump(),
        }

    model_config = SettingsConfigDict(env_file=(".env",), env_prefix="PYLENS_MAIN__", extra="ignore")

    @model_validator(mode="after")
    def validate_weights(self):
        """Ensure weights are valid."""
        if self.api.weight_similarity < 0 or self.api.weight_weekly_downloads < 0:
            raise ValueError("Weights must be non-negative")
        if self.api.weight_similarity == 0 and self.api.weight_weekly_downloads == 0:
            raise ValueError("At least one weight must be non-zero")
        return self


# ─────────────────────────────────────────────────────────────────────────────
# Global config instance
# ─────────────────────────────────────────────────────────────────────────────

config = Config.from_toml()


if __name__ == "__main__":
    from pprint import pprint

    pprint(config.dump())
