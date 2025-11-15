<p align="center">
  <img src="./static/pypi.svg" alt="PyLens Logo" width="300">
</p>

<br/>
<p align="center">
  <img src="https://github.com/fpgmaas/pylens/blob/main/static/demo.gif?raw=true" alt="PyLens Demo" width="700">
</p>

## What does this do?

Finding the right Python package on [PyPI](https://pypi.org/) can be a bit difficult, since PyPI isn't really designed for discovering packages easily. For example, you can search for the word "plot" and get a list of hundreds of packages that contain the word "plot" in seemingly random order.

Inspired by [this blog post](https://koaning.io/posts/search-boxes/) about finding arXiv articles using vector embeddings, I decided to build a small application that helps you find Python packages with a similar approach. For example, you can ask it "I want to make nice plots and visualizations", and it will provide you with a short list of packages that can help you with that.

## How does this work?

The project works by collecting project summaries and descriptions for all packages on PyPI with more than 100 weekly downloads. These are then converted into vector representations using [Sentence Transformers](https://www.sbert.net/). When the user enters a query, it is converted into a vector representation, and the most similar package descriptions are fetched from the vector database. Additional weight is given to the amount of weekly downloads before presenting the results to the user in a dashboard.

## Stack

The project uses the following technologies:

1. **[FastAPI](https://fastapi.tiangolo.com/)** for the API backend
2. **[NextJS](https://nextjs.org/) and [TailwindCSS](https://tailwindcss.com/)** for the frontend
3. **[Sentence Transformers](https://www.sbert.net/)** for vector embeddings

## Getting Started

### Build and Setup

#### 1. **Configure Environment**

The project uses Azure Blob Storage for data storage. Create a `.env` file with your credentials:

```sh
cp .env.template .env
```

Fill in the required Azure Blob Storage credentials:

- `PYLENS_ENV`: Set to `dev` for development or `prod` for production
- `PYLENS_STORAGE__BLOB_ACCOUNT_NAME`: Your Azure storage account name
- `PYLENS_STORAGE__BLOB_CONTAINER_NAME`: Your blob container name
- `PYLENS_STORAGE__BLOB_ACCOUNT_KEY`: Your storage account key

The application uses TOML config files (`config.dev.toml` and `config.prod.toml`) for environment-specific settings. In development, the API will cache blob files locally and skip re-downloading if they exist. In production, the API always downloads fresh data from blob storage on startup.

#### 2. **Run the Setup Script**

The setup script will:

- Download and process the PyPI dataset and store the results in the `data` directory.
- Create vector embeddings for the PyPI dataset.
- Upload the processed datasets to Azure Blob Storage.

There are three methods to run the setup script, dependent on if you have a NVIDIA GPU and [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) installed. Please run the setup script using the method that is applicable for you:

- [Option 1: Using uv](SETUP.md#option-1-using-uv)
- [Option 2: Using Docker with NVIDIA GPU and NVIDIA Container Toolkit](SETUP.md#option-2-using-docker-with-nvidia-gpu-and-nvidia-container-toolkit)
- [Option 3: Using Docker without NVIDIA GPU and NVIDIA Container Toolkit](SETUP.md#option-3-using-docker-without-nvidia-gpu-and-nvidia-container-toolkit)

> [!NOTE]
> The dataset contains approximately 100.000 packages on PyPI with more than 100 weekly downloads. To speed up local development,
> you can lower the amount of packages that is processed locally by lowering the value of `frac_data_to_include` in `config.dev.toml`.

#### 3. **Run the Application**

Start the application using Docker Compose:

```sh
docker-compose up
```

After a short while, your application will be live at [http://localhost:3000](http://localhost:3000).

## Data

The dataset for this project is created using the [PyPI dataset on Google BigQuery](https://console.cloud.google.com/marketplace/product/gcp-public-data-pypi/pypi?project=regal-net-412415). The SQL query used can be found in [pypi_bigquery.sql](./pypi_bigquery.sql). The resulting dataset is available as a CSV file on [Google Drive](https://drive.google.com/file/d/1huR7-VD3AieBRCcQyRX9MWbPLMb_czjq/view?usp=sharing).
