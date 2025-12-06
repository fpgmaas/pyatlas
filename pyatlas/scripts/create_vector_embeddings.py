import logging
from pathlib import Path

import polars as pl
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

from pyatlas.config import Config
from pyatlas.embeddings.embeddings_creator import VectorEmbeddingCreator
from pyatlas.utils.logging import setup_logging


def read_processed_dataset(path_to_processed_dataset: Path):
    logging.info("📂 Reading the processed dataset...")
    df = pl.read_csv(path_to_processed_dataset)
    logging.info(f"📊 Number of rows in the processed dataset: {len(df):,}")
    return df


def write_parquet(df: pl.DataFrame, processed_dataset_path: Path):
    logging.info(f"Storing dataset in {processed_dataset_path}...")
    df.write_parquet(processed_dataset_path)
    logging.info("✅ Done!")


def create_vector_embeddings():
    setup_logging()
    load_dotenv()

    config = Config.from_toml()
    df = read_processed_dataset(config.storage.data_folder / config.storage.processed_dataset_csv)
    df = df.with_columns(
        summary_and_description_cleaned=pl.concat_str(pl.col("summary"), pl.lit(" - "), pl.col("description_cleaned"))
    )
    df = VectorEmbeddingCreator(embeddings_model=SentenceTransformer(config.app.embeddings_model_name)).add_embeddings(
        df, text_column="summary_and_description_cleaned"
    )

    df = df.select("name", "embeddings").unique(subset="name")
    write_parquet(df, config.storage.data_folder / config.storage.embeddings_parquet)


if __name__ == "__main__":
    setup_logging()
    create_vector_embeddings()
