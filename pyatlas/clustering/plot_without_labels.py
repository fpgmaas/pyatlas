from typing import cast

import plotly.express as px
import polars as pl


def create_dataset_for_unlabeled_plot(df: pl.DataFrame) -> pl.DataFrame:
    df = df.with_columns(pl.col("cluster_id").cast(pl.String).alias("cluster_id"))

    projected = df.with_columns(
        weekly_downloads=pl.col("weekly_downloads").fill_null(0),
    )

    log_dl = (projected["weekly_downloads"] + 1).log10()
    log_min = cast(float, log_dl.min())
    log_max = cast(float, log_dl.max())
    denom = log_max - log_min if log_max > log_min else 1.0

    min_size = 16
    max_size = 128
    gamma = 1  # >1: emphasise high end, <1: emphasise low end

    norm = (log_dl - log_min) / denom
    norm = norm.clip(0, 1) ** gamma

    size_vals = min_size + (max_size - min_size) * norm
    size_vals = size_vals.clip(min_size, max_size)

    projected = projected.with_columns(
        log_dl=log_dl,
        size=size_vals,
    ).drop(["log_dl"])

    return projected


def create_plot(df):
    fig = px.scatter(
        df,
        x="x",
        y="y",
        hover_name="name",
        color="cluster_id",
        size="size",
        custom_data=["weekly_downloads", "cluster_id", "summary"],
        title="Embedding projection",
        opacity=0.5,
        height=1000,
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
            "cluster=%{customdata[1]}<extra></extra>"
        ),
    )

    fig.update_layout(
        template="plotly_white",
        margin={"l": 20, "r": 20, "t": 60, "b": 40},
        xaxis_title="Component 1",
        yaxis_title="Component 2",
        legend_title_text="Cluster",
        yaxis_scaleanchor="x",
        yaxis_scaleratio=1,
    )

    return fig
