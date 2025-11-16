import marimo

__generated_with = "0.17.8"
app = marimo.App(width="medium")


@app.cell
def _():
    import polars as pl

    df = pl.read_csv("data/processed_dataset.csv")
    return (df,)


@app.cell
def _(df):
    df.to_dicts()[1900:1950]
    return


@app.cell
def _():
    return


if __name__ == "__main__":
    app.run()
