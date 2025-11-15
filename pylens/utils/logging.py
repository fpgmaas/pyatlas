import logging


def setup_logging() -> None:
    logging.getLogger("azure").setLevel(logging.WARNING)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler()],
    )
