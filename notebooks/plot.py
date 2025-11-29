import marimo

__generated_with = "0.18.1"
app = marimo.App(width="full")


@app.cell
def _():
    import numpy as np
    import polars as pl
    import plotly.express as px
    from sklearn.decomposition import IncrementalPCA, PCA
    import marimo as mo
    from dotenv import load_dotenv
    import random

    random.seed(1234)

    load_dotenv()
    return (pl,)


@app.cell
def _(pl):
    from pymap.clustering.plot_without_labels import create_dataset_for_unlabeled_plot, create_plot

    df = pl.read_csv("data/clustered_dataset.csv")
    df_plot = create_dataset_for_unlabeled_plot(df)
    fig = create_plot(df_plot)
    fig.write_html("figure.html")
    fig
    return


@app.cell
def _(pl):
    from pymap.clustering.plot_with_labels import create_dataset_for_labeled_plot, create_plot_with_labels

    df2 = pl.read_csv("data/clustered_dataset.csv")
    df_cluster_labels = pl.read_csv("data/cluster_labels.csv")
    df_cluster_metadata = pl.read_csv("data/cluster_metadata.csv")
    df_clusters = df_cluster_labels.join(df_cluster_metadata, on="cluster_id",how="outer")

    # df2 = df2.filter(pl.col("cluster_id")==22)
    # df_clusters = df_clusters.filter(pl.col("cluster_id")==22)

    df_plot2 = create_dataset_for_labeled_plot(df2, df_clusters)
    fig2 = create_plot_with_labels(df_plot2, df_clusters)
    fig2.write_html("figure2.html")
    fig2
    return


@app.cell
def _():
    return


if __name__ == "__main__":
    app.run()
