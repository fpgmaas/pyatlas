import numpy as np
import polars as pl
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


class SimpleVectorDatabase:
    def __init__(
        self,
        embeddings_model: SentenceTransformer,
        df_embeddings: pl.DataFrame,
        embedding_column: str = "embeddings",
        processed_column: str = "embeddings_array",
    ):
        """
        Initializes the SimpleVectorDatabase with a SentenceTransformer model and a DataFrame containing embeddings.

        Args:
            embeddings_model (SentenceTransformer): The SentenceTransformer model to generate embeddings.
            df_embeddings (pl.DataFrame): The Polars DataFrame containing the initial embeddings.
            embedding_column (str, optional): The name of the column containing the original embeddings. Defaults to 'embeddings'.
        """
        self.embeddings_model = embeddings_model
        self.df_embeddings = df_embeddings
        self.embedding_column = embedding_column
        self.embeddings_matrix = self._create_embeddings_matrix()

    def find_similar(self, query: str, top_k: int = 25) -> pl.DataFrame:
        """
        Finds the top_k most similar vectors in the database for a given query.

        Args:
            query (str): The query string to find similar vectors for.
            top_k (int, optional): The number of similar vectors to retrieve. Defaults to 25.

        Returns:
            pl.DataFrame: A Polars DataFrame containing the most similar vectors and their similarity scores.
        """
        query_embedding = self.embeddings_model.encode(query, show_progress_bar=False)

        similarities = cosine_similarity([query_embedding], self.embeddings_matrix)[0]

        top_k_indices = np.argsort(similarities)[::-1][:top_k]
        top_k_scores = similarities[top_k_indices]
        df_best_matches = self.df_embeddings[top_k_indices]

        df_best_matches = df_best_matches.with_columns(pl.Series("similarity", top_k_scores))
        df_best_matches = df_best_matches.drop(self.embedding_column)

        return df_best_matches

    def _create_embeddings_matrix(self) -> np.ndarray:
        return np.stack(
            self.df_embeddings[self.embedding_column].apply(lambda x: np.array(x, dtype=np.float32)).to_numpy()
        )
