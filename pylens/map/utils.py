from pylens.config import config
import polars as pl
import numpy as np
import umap


def get_dataset():
    
    df_embeddings = pl.read_parquet(config.DATA_DIR / config.EMBEDDINGS_PARQUET_NAME, columns=["name", "embeddings"])
    df_meta = pl.read_csv(config.DATA_DIR / config.PROCESSED_DATASET_CSV_NAME, columns=["name", "weekly_downloads", "summary"])
    df_joined = df_embeddings.join(df_meta, on="name", how="left")
    df = df_joined.sort("weekly_downloads",descending=True)
    return df
    
def create_dataset_for_plot(df: pl.DataFrame, coords: np.array) -> pl.DataFrame:
    projected = df.with_columns(
        x=coords[:, 0],
        y=coords[:, 1],
        weekly_downloads=pl.col("weekly_downloads").fill_null(0),
    )

    log_dl = (projected["weekly_downloads"] + 1).log10()
    log_min = float(log_dl.min())
    log_max = float(log_dl.max())
    denom = log_max - log_min if log_max > log_min else 1.0

    # --- size mapping params ---
    min_size = 16      # smaller low-download dots
    max_size = 64     # much bigger high-download dots
    gamma = 2      # >1: emphasise high end, <1: emphasise low end

    # Normalize to 0..1
    norm = (log_dl - log_min) / denom
    # Non-linear mapping: push more contrast to the top end
    norm = norm.clip(0, 1) ** gamma

    size_vals = min_size + (max_size - min_size) * norm
    size_vals = size_vals.clip(min_size, max_size)

    projected = projected.with_columns(
        log_dl=log_dl,
        size=size_vals,
    ).select(["name", "summary", "weekly_downloads", "size", "x", "y"])

    return projected


def cluster_with_umap(embeddings: np.array, n_components: int = 2) -> np.array:

    umap_reducer = umap.UMAP(
        n_components=n_components,
        n_neighbors=10,   # smaller -> more, tighter clusters; larger -> smoother
        min_dist=0.1,     # smaller -> tighter blobs; larger -> more spread
        metric="cosine",
        random_state=0,
    )
    coords = umap_reducer.fit_transform(embeddings)
    return coords