import marimo

__generated_with = "0.18.1"
app = marimo.App(width="full")


@app.cell
def _():
    import random

    import numpy as np
    import plotly.express as px
    import polars as pl
    from dotenv import load_dotenv

    random.seed(1234)

    load_dotenv()

    EMBEDDINGS_PATH = "data/embeddings.parquet"
    META_PATH = "data/processed_dataset.csv"
    SAMPLE_SIZE = 10000
    return SAMPLE_SIZE, np, pl, px


@app.cell
def _(SAMPLE_SIZE):
    from pymap.map.utils import cluster_with_umap, create_dataset_for_plot, get_dataset

    df = get_dataset()
    n_rows = df.height
    embedding_dim = len(df["embeddings"].item(0)) if n_rows else 0
    sampled = df.head(SAMPLE_SIZE)
    return cluster_with_umap, create_dataset_for_plot, n_rows, sampled


@app.cell
def _(cluster_with_umap, create_dataset_for_plot, np, sampled):
    embeddings = np.asarray(sampled["embeddings"].to_list(), dtype=np.float32)
    coords = cluster_with_umap(embeddings, n_components=2)
    df_projected = create_dataset_for_plot(sampled, coords)
    return df_projected, embeddings


@app.cell
def _(cluster_with_umap, embeddings):
    import hdbscan
    from sklearn.preprocessing import normalize

    coords_for_hdbscan = cluster_with_umap(embeddings, n_components=10)
    norm_data = normalize(coords_for_hdbscan, norm="l2")

    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=8,
        min_samples=2,
        metric="euclidean",
        cluster_selection_method="leaf",
        cluster_selection_epsilon=0.01,
    )
    labels = clusterer.fit_predict(norm_data)  # -1 = noise
    return (labels,)


@app.cell
def _(df_projected, labels, pl):
    df_plot = df_projected.with_columns(cluster=pl.Series("cluster", labels)).with_columns(
        pl.col("cluster").cast(pl.Utf8).alias("cluster_str")
    )
    return (df_plot,)


@app.cell
def _(SAMPLE_SIZE, df_plot, n_rows, px):
    fig = px.scatter(
        df_plot,
        x="x",
        y="y",
        hover_name="name",
        color="cluster_str",  # color by cluster
        size="size",  # marker size from log(downloads)
        custom_data=["weekly_downloads", "cluster_str", "summary"],
        title=f"Embedding projection ({SAMPLE_SIZE:,} of {n_rows:,} rows)",
        opacity=0.5,
        height=1000,  # taller figure
    )

    fig.update_traces(
        marker=dict(
            line=dict(width=0.4, color="rgba(0,0,0,0.25)"),
        ),
        hovertemplate=(
            "<b>%{hovertext}</b><br>"
            "<b>%{customdata[2]}</b><br>"
            "x=%{x:.2f}<br>"
            "y=%{y:.2f}<br>"
            "downloads=%{customdata[0]:,.0f}<br>"
            "cluster=%{customdata[1]}<extra></extra>"
        ),
    )

    fig.update_layout(
        template="plotly_white",
        margin=dict(l=20, r=20, t=60, b=40),
        xaxis_title="Component 1",
        yaxis_title="Component 2",
        legend_title_text="Cluster",
        # Keep aspect ratio so distances feel Euclidean
        yaxis_scaleanchor="x",
        yaxis_scaleratio=1,
    )

    fig.write_html("figure.html")
    print("done")
    return (fig,)


@app.cell
def _(fig):
    fig
    return


@app.cell
def _(df_plot):
    df_plot
    return


@app.cell
def _():
    return


if __name__ == "__main__":
    app.run()
