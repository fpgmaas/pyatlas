import logging

from dotenv import load_dotenv

from pymap.config import Config
from pymap.data.description.description_cleaner import DescriptionCleaner
from pymap.data.raw_data_reader import RawDataReader
from pymap.utils.logging import setup_logging


def read_raw_dataset(path_to_raw_dataset):
    logging.info("📂 Reading the raw dataset...")
    df = RawDataReader(path_to_raw_dataset).read()
    logging.info(f"📊 Number of rows in the raw dataset: {len(df):,}")
    logging.info(f"The highest weekly downloads in the raw dataset: {df['weekly_downloads'].max():,}")
    logging.info(f"The lowest weekly downloads in the raw dataset: {df['weekly_downloads'].min():,}")
    return df


def keep_top_packages(df, n_top_packages):
    logging.info(f"Using only the top {n_top_packages} packages based on weekly downloads.")
    df = df.sort("weekly_downloads", descending=True)
    df = df.head(n_top_packages)
    logging.info(f"📊 Number of rows after filtering: {len(df):,}")
    logging.info(f"The highest weekly downloads in the filtered dataset: {df['weekly_downloads'].max():,}")
    logging.info(f"The lowest weekly downloads in the filtered dataset: {df['weekly_downloads'].min():,}")
    return df


def extract_description_text(df):
    """
    Extract plain text from package descriptions using content-type-aware rendering.

    This function:
    1. Detects content type (Markdown, RST, or plain text)
    2. Renders to HTML using readme_renderer
    3. Extracts clean plain text using BeautifulSoup
    4. Filters out failed extractions
    """
    logging.info("📝 Extracting plain text from descriptions...")
    df = DescriptionCleaner().extract_text(df, "description", "description_cleaned")
    logging.info(f"📊 Number of rows after extraction and filtering: {len(df):,}")
    return df


def write_csv(df, processed_dataset_path):
    logging.info(f"Storing dataset in {processed_dataset_path}...")
    df.write_csv(processed_dataset_path)
    logging.info("✅ Done!")


def process_raw_dataset():
    load_dotenv()
    config = Config.from_toml()
    df = read_raw_dataset(config.storage.data_folder / config.storage.raw_dataset_csv)
    if config.etl.top_packages_to_include:
        df = keep_top_packages(df, config.etl.top_packages_to_include)
    df = extract_description_text(df)

    write_csv(df, config.storage.data_folder / config.storage.processed_dataset_csv)


if __name__ == "__main__":
    setup_logging()
    process_raw_dataset()
