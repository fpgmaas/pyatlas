# Development

### Prerequisites

Create a `.env` file with your OpenAI API key:

```sh
cp .env.template .env
```

Then fill in your `PYATLAS__OPENAI_API_KEY`. This is used to generate cluster labels with `gpt-5-mini`. The setup script makes about 170 API calls (one per cluster), using less than 200,000 tokens in total, so incurred costs are minimal.

### Running the Setup Script

The setup script will:

- Download and process the PyPI dataset.
- Create vector embeddings for the package descriptions.
- Run UMAP and HDBSCAN to compute coordinates and clusters.
- Generate cluster labels using OpenAI.

Run it with:

```sh
uv run python pyatlas/scripts/setup.py
```

### Running the Application

Start the frontend:

```sh
cd frontend
npm install
npm run dev
```

The application will be available at [http://localhost:5173](http://localhost:5173).

## Data

The dataset for this project is created using the [PyPI dataset on Google BigQuery](https://console.cloud.google.com/marketplace/product/gcp-public-data-pypi/pypi). The SQL query used can be found in [pypi_bigquery.sql](./pypi_bigquery.sql).
