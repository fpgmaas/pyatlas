import polars as pl
import pytest

from pyatlas.clustering.constellations import ClusterConstellationsGenerator


@pytest.fixture
def generator():
    return ClusterConstellationsGenerator(
        min_packages=3,
        top_percent=0.5,
        cutoff_length_frac=10.0,
    )


@pytest.fixture
def sample_df():
    return pl.DataFrame(
        {
            "name": ["a", "b", "c", "d", "e", "f"],
            "x": [0.0, 0.1, 0.05, 0.5, 0.6, 0.55],
            "y": [0.0, 0.0, 0.1, 0.5, 0.5, 0.6],
            "cluster_id": ["1", "1", "1", "2", "2", "2"],
            "weekly_downloads": [100, 200, 150, 300, 250, 350],
        }
    )


def test_generate_constellations_returns_expected_columns(generator, sample_df):
    result = generator.generate_constellations(sample_df)
    expected = {"cluster_id", "from_package", "to_package", "from_x", "from_y", "to_x", "to_y"}
    assert set(result.columns) == expected


def test_generate_constellations_creates_mst_edges(generator, sample_df):
    result = generator.generate_constellations(sample_df)
    # 2 clusters with 3 packages each -> 2 edges per cluster = 4 total
    assert len(result) == 4


def test_generate_constellations_excludes_noise_cluster(generator):
    df = pl.DataFrame(
        {
            "name": ["a", "b", "c", "d", "e", "f"],
            "x": [0.0, 0.1, 0.05, 0.5, 0.6, 0.55],
            "y": [0.0, 0.0, 0.1, 0.5, 0.5, 0.6],
            "cluster_id": ["-1", "-1", "-1", "1", "1", "1"],
            "weekly_downloads": [100, 200, 150, 300, 250, 350],
        }
    )
    result = generator.generate_constellations(df)
    assert "-1" not in result["cluster_id"].to_list()


def test_generate_constellations_empty_when_insufficient_packages(generator):
    df = pl.DataFrame(
        {
            "name": ["a", "b"],
            "x": [0.0, 0.1],
            "y": [0.0, 0.1],
            "cluster_id": ["1", "1"],
            "weekly_downloads": [100, 200],
        }
    )
    result = generator.generate_constellations(df)
    assert len(result) == 0
