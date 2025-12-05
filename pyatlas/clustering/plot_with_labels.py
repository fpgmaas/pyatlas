import plotly.express as px
import polars as pl


def create_dataset_for_labeled_plot(df: pl.DataFrame, cluster_metadata: pl.DataFrame) -> pl.DataFrame:
    """Prepare dataset for plotting with cluster labels.

    Args:
        df: Main dataset with cluster assignments
        cluster_metadata: Metadata with cluster_id, cluster_label, centroid_x, centroid_y

    Returns:
        DataFrame ready for plotting with labels
    """
    df = df.with_columns(pl.col("cluster_id").cast(pl.String).alias("cluster_id"))
    cluster_metadata = cluster_metadata.with_columns(pl.col("cluster_id").cast(pl.String).alias("cluster_id"))

    # Join cluster labels to the main dataset
    df = df.join(cluster_metadata.select(["cluster_id", "cluster_label"]), on="cluster_id", how="left")

    # Handle missing labels (e.g., for noise cluster -1)
    df = df.with_columns(
        pl.when(pl.col("cluster_label").is_null())
        .then(pl.lit("Unclustered"))
        .otherwise(pl.col("cluster_label"))
        .alias("cluster_label")
    )

    projected = df.with_columns(
        weekly_downloads=pl.col("weekly_downloads").fill_null(0),
    )

    log_dl = (projected["weekly_downloads"] + 1).log10()
    log_min = float(log_dl.min())
    log_max = float(log_dl.max())
    denom = log_max - log_min if log_max > log_min else 1.0

    # --- size mapping params ---
    min_size = 16  # smaller low-download dots
    max_size = 128  # much bigger high-download dots
    gamma = 1  # >1: emphasise high end, <1: emphasise low end

    # Normalize to 0..1
    norm = (log_dl - log_min) / denom
    # Non-linear mapping: push more contrast to the top end
    norm = norm.clip(0, 1) ** gamma

    size_vals = min_size + (max_size - min_size) * norm
    size_vals = size_vals.clip(min_size, max_size)

    projected = projected.with_columns(
        log_dl=log_dl,
        size=size_vals,
    ).drop(["log_dl"])

    return projected


def create_plot_with_labels(df: pl.DataFrame, cluster_metadata: pl.DataFrame):
    """Create a scatter plot with cluster labels as text annotations.

    Args:
        df: Main dataset prepared with create_dataset_for_labeled_plot
        cluster_metadata: Metadata with cluster_id, cluster_label, centroid_x, centroid_y

    Returns:
        Plotly figure with scatter plot and cluster labels
    """
    # Create the scatter plot
    fig = px.scatter(
        df,
        x="x",
        y="y",
        hover_name="name",
        color="cluster_label",  # color by cluster label
        size="size",  # marker size from log(downloads)
        custom_data=["weekly_downloads", "cluster_id", "summary", "cluster_label"],
        title="Embedding projection with cluster labels",
        opacity=0.5,
        height=1000,  # taller figure
    )

    fig.update_traces(
        marker={
            "line": {"width": 0.4, "color": "rgba(0,0,0,0.25)"},
        },
        hovertemplate=(
            "<b>%{hovertext}</b><br>"
            "<b>%{customdata[2]}</b><br>"
            "x=%{x:.2f}<br>"
            "y=%{y:.2f}<br>"
            "downloads=%{customdata[0]:,.0f}<br>"
            "cluster=%{customdata[3]}<extra></extra>"
        ),
    )

    # Add cluster labels as text annotations at centroid positions
    cluster_metadata_str = cluster_metadata.with_columns(pl.col("cluster_id").cast(pl.String))

    annotations = []
    for row in cluster_metadata_str.iter_rows(named=True):
        annotations.append(
            {
                "x": row["centroid_x"],
                "y": row["centroid_y"],
                "text": row["cluster_label"],
                "showarrow": False,
                "font": {"size": 12, "color": "black", "family": "Arial, sans-serif"},
                "bgcolor": "rgba(255, 255, 255, 0.7)",
                "bordercolor": "rgba(0, 0, 0, 0.3)",
                "borderwidth": 1,
                "borderpad": 4,
            }
        )

    fig.update_layout(
        template="plotly_white",
        margin={"l": 20, "r": 20, "t": 60, "b": 40},
        xaxis_title="Component 1",
        yaxis_title="Component 2",
        legend_title_text="Cluster",
        # Keep aspect ratio so distances feel Euclidean
        yaxis_scaleanchor="x",
        yaxis_scaleratio=1,
        annotations=annotations,
    )

    return fig
