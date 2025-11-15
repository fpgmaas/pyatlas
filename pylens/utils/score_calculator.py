import polars as pl


def calculate_score(
    df: pl.DataFrame, weight_similarity: float = 0.5, weight_weekly_downloads: float = 0.5
) -> pl.DataFrame:
    """
    Calculate a combined score for packages based on similarity and weekly downloads.

    This function normalizes the 'similarity' and 'weekly_downloads' columns to a [0, 1] scale,
    and computes a combined score using the provided weights for similarity and weekly downloads.
    The combined score helps in recommending packages that are both popular and relevant based on similarity.

    Args:
        df (pl.DataFrame): DataFrame containing 'similarity' and 'weekly_downloads' columns.
        weight_similarity (float): Weight for the similarity score in the combined score calculation. Default is 0.5.
        weight_weekly_downloads (float): Weight for the weekly downloads score in the combined score calculation. Default is 0.5.

    Returns:
        pl.DataFrame: DataFrame with the combined score and sorted by this score in descending order.
    """
    df = df.with_columns(
        log_weekly_downloads=pl.col("weekly_downloads").log1p()  # log1p is log(1 + x)
    )

    df = df.with_columns(
        normalized_similarity=(pl.col("similarity") - pl.col("similarity").min())
        / (pl.col("similarity").max() - pl.col("similarity").min()),
        normalized_log_weekly_downloads=(pl.col("log_weekly_downloads") - pl.col("log_weekly_downloads").min())
        / (pl.col("log_weekly_downloads").max() - pl.col("log_weekly_downloads").min()),
    )

    df = df.with_columns(
        score=weight_similarity * pl.col("normalized_similarity")
        + weight_weekly_downloads * pl.col("normalized_log_weekly_downloads")
    )

    df = df.sort("score", descending=True)
    return df
