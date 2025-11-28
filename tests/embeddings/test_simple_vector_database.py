from unittest.mock import MagicMock

import numpy as np
import polars as pl
import pytest

from pymap.embeddings.simple_vector_database import SimpleVectorDatabase


@pytest.fixture
def mock_model():
    # Mock the SentenceTransformer model
    mock_model = MagicMock()
    # Mock the encode method to return a fixed vector
    mock_model.encode.return_value = np.array([0.5, 0.5, 0.5])
    return mock_model


@pytest.fixture
def df_embeddings():
    return pl.DataFrame(
        {
            "id": [1, 2, 3],
            "text": ["Hello world", "Hi there", "Greetings"],
            "embeddings": [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6], [0.7, 0.8, 0.9]],
        }
    )


@pytest.fixture
def vector_db(mock_model, df_embeddings):
    return SimpleVectorDatabase(embeddings_model=mock_model, df_embeddings=df_embeddings)


def test_embeddings_matrix_creation(vector_db):
    expected_matrix = np.array([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6], [0.7, 0.8, 0.9]], dtype=np.float32)

    np.testing.assert_allclose(vector_db.embeddings_matrix, expected_matrix, rtol=1e-6, atol=1e-8)


def test_find_similar(vector_db):
    query = "Hello"
    result = vector_db.find_similar(query, top_k=2)

    assert result.shape[0] == 2

    assert result["similarity"].min() >= 0
    assert result["similarity"].max() <= 1

    expected_columns = ["id", "text", "similarity"]
    assert set(result.columns) == set(expected_columns)
