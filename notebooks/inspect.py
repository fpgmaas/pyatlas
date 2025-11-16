import marimo

__generated_with = "0.17.8"
app = marimo.App(width="medium")


@app.cell
def _():
    import polars as pl

    df = pl.read_csv("data/processed_dataset.csv")
    return df, pl


@app.cell
def _(df, pl):
    df.filter(pl.col("name") == "plotly").to_dicts()
    return


@app.cell
def _():
    return


if __name__ == "__main__":
    app.run()
