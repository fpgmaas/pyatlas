import logging

import polars as pl
from sentence_transformers import SentenceTransformer
from tqdm import tqdm


class VectorEmbeddingCreator:
    def __init__(
        self,
        embeddings_model: SentenceTransformer,
        embedding_column_name: str = "embeddings",
        batch_size: int = 128,
    ):
        """
        Initializes the VectorEmbeddingCreator with a SentenceTransformer model, embedding column name, and batch size.

        Args:
            embeddings_model (SentenceTransformer): The SentenceTransformer model to generate embeddings.
            embedding_column_name (str, optional): The name of the column to store embeddings. Defaults to 'embeddings'.
            batch_size (int, optional): The size of batches to process at a time. Defaults to 128.
        """
        self.model = embeddings_model
        self.embedding_column_name = embedding_column_name
        self.batch_size = batch_size

    def add_embeddings(self, df: pl.DataFrame, text_column: str) -> pl.DataFrame:
        """
        Adds embeddings to the DataFrame based on the specified text column.

        Args:
            df (pl.DataFrame): The Polars DataFrame to which embeddings will be added.
            text_column (str): The column name containing text to generate embeddings for.

        Returns:
            pl.DataFrame: The DataFrame with an additional column containing embeddings.
        """
        logging.info("Splitting DataFrame into batches...")
        df_chunks = self._split_dataframe_in_batches(df, batch_size=self.batch_size)
        all_embeddings = []

        logging.info("Generating embeddings...")
        for chunk in tqdm(df_chunks, desc="Generating embeddings", unit="batch"):
            embeddings = self._generate_embeddings(chunk, text_column)
            all_embeddings.extend(embeddings)

        df = df.with_columns(pl.Series(self.embedding_column_name, all_embeddings))
        return df

    def _generate_embeddings(self, chunk: pl.DataFrame, text_column: str) -> list:
        embeddings = self.model.encode(list(chunk[text_column]), show_progress_bar=False)
        return embeddings

    @staticmethod
    def _split_dataframe_in_batches(df: pl.DataFrame, batch_size: int) -> list:
        """
        Splits a Polars DataFrame into batches.
        """
        n_chunks = (df.height + batch_size - 1) // batch_size
        return [df.slice(i * batch_size, batch_size) for i in range(n_chunks)]
