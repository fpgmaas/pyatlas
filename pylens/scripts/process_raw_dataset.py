import logging

import polars as pl
from dotenv import load_dotenv

from pylens.config import Config
from pylens.data.description_cleaner import CLEANING_FAILED, DescriptionCleaner
from pylens.data.raw_data_reader import RawDataReader
from pylens.utils.logging import setup_logging


def read_raw_dataset(path_to_raw_dataset):
    logging.info("📂 Reading the raw dataset...")
    df = RawDataReader(path_to_raw_dataset).read()
    logging.info(f"📊 Number of rows in the raw dataset: {len(df):,}")
    logging.info(f"The highest weekly downloads in the raw dataset: {df['weekly_downloads'].max():,}")
    logging.info(f"The lowest weekly downloads in the raw dataset: {df['weekly_downloads'].min():,}")
    return df


def filter_top_packages(df, frac_data_to_include):
    logging.info(
        f"Using only the packages with weekly_downloads in the top {frac_data_to_include * 100}% of the dataset because config.FRAC_DATA_TO_INCLUDE is set to {frac_data_to_include}!"
    )
    logging.info(
        "This means packages with low download counts are excluded from the results in the dashboard. To include more data, set config.FRAC_DATA_TO_INCLUDE to a higher value."
    )
    df = df.sort("weekly_downloads", descending=True)
    df = df.head(round(frac_data_to_include * len(df)))

    logging.info(f"📊 Number of rows after filtering: {len(df):,}")
    logging.info(f"The highest weekly downloads in the filtered dataset: {df['weekly_downloads'].max():,}")
    logging.info(f"The lowest weekly downloads in the filtered dataset: {df['weekly_downloads'].min():,}")
    return df


def clean_descriptions(df):
    logging.info("🧹 Cleaning the descriptions...")
    df = DescriptionCleaner().clean(df, "description", "description_cleaned")
    df = df.filter(~pl.col("description_cleaned").is_null())
    df = df.filter(pl.col("description_cleaned") != CLEANING_FAILED)
    return df


def write_csv(df, processed_dataset_path):
    logging.info(f"Storing dataset in {processed_dataset_path}...")
    df.write_csv(processed_dataset_path)
    logging.info("✅ Done!")


def process_raw_dataset():
    load_dotenv()
    config = Config()
    df = read_raw_dataset(config.DATA_DIR / config.RAW_DATASET_CSV_NAME)
    if config.FRAC_DATA_TO_INCLUDE < 1.0:
        df = filter_top_packages(df, config.FRAC_DATA_TO_INCLUDE)
    df = clean_descriptions(df)

    write_csv(df, config.DATA_DIR / config.PROCESSED_DATASET_CSV_NAME)
    write_csv(df.select(["name", "summary", "weekly_downloads"]), config.DATA_DIR / config.DATASET_FOR_API_CSV_NAME)


if __name__ == "__main__":
    setup_logging()
    process_raw_dataset()
