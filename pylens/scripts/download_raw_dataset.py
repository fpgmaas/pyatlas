import logging

import gdown
from dotenv import load_dotenv

from pylens.config import Config
from pylens.utils.logging import setup_logging


def download_raw_dataset():
    """
    Downloads the dataset from a Google Drive link using the gdown library.
    """
    load_dotenv()
    config = Config.from_toml()

    target_path = config.DATA_DIR / config.RAW_DATASET_CSV_NAME
    if target_path.exists():
        if not config.OVERWRITE:
            logging.info(f"🔹 Raw dataset {target_path} from Google Drive already exists! Skipping download.")
            return
        else:
            logging.info(
                f"⤵️  Raw dataset {target_path} from Google Drive exists, but config.OVERWRITE is `true`. Overwriting..."
            )

    logging.info(f"⬇️ Downloading raw dataset from Google Drive to {target_path}...")
    url = f"https://drive.google.com/uc?id={config.GOOGLE_FILE_ID}"
    gdown.download(url, str(target_path), quiet=False)
    logging.info("✅ Done!")


if __name__ == "__main__":
    setup_logging()
    download_raw_dataset()
