import numpy as np
import polars as pl

from pyatlas.clustering.clustering import ClusterIdGenerator


class TestClusterIdGenerator:
    def test_generate_cluster_ids(self):
        """Test that cluster IDs are generated for a DataFrame with embeddings."""
        np.random.seed(42)
        n_samples = 100
        embedding_dim = 32

        # Create data with actual cluster structure (3 clusters)
        # instead of pure random noise so HDBSCAN can find clusters
        n_per_cluster = n_samples // 3
        cluster_centers = [
            np.random.randn(embedding_dim) * 5,
            np.random.randn(embedding_dim) * 5,
            np.random.randn(embedding_dim) * 5,
        ]
        embeddings = []
        for _, center in enumerate(cluster_centers):
            cluster_points = center + np.random.randn(n_per_cluster, embedding_dim) * 0.5
            embeddings.extend(cluster_points.tolist())
        # Add remaining points to fill up to n_samples
        remaining = n_samples - len(embeddings)
        if remaining > 0:
            extra_points = cluster_centers[0] + np.random.randn(remaining, embedding_dim) * 0.5
            embeddings.extend(extra_points.tolist())
        df = pl.DataFrame({"id": range(n_samples), "embeddings": embeddings})

        generator = ClusterIdGenerator()
        result = generator.generate_cluster_ids(df, embeddings_column="embeddings")

        assert "cluster_id" in result.columns
        assert len(result) == n_samples
        assert result["cluster_id"].dtype == pl.Utf8
