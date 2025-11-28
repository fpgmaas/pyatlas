# Running the Setup Script

The setup script will:

- Download and process the PyPI dataset and store the results in the `data` directory.
- Create vector embeddings for the PyPI dataset.
- Upload the processed datasets to Azure Blob Storage.

There are three ways to run the setup script:

### Option 1: Using uv

You can run the setup script using a virtual environment with uv. This method will automatically utilize your GPU for the vector embeddings if it is detected.

1. Install dependencies and set up the virtual environment:

   ```sh
   uv install
   ```

2. Run the setup script:

   ```sh
   uv run python pymap/scripts/setup.py
   ```

### Option 2: Using Docker with NVIDIA GPU and NVIDIA Container Toolkit

If you have an NVIDIA GPU and the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) installed, follow these steps:

1. Build the Docker image:

   ```sh
   docker build -t pymap .
   ```

2. Run the setup script in a Docker container with GPU support:

   ```sh
   docker run --rm \
      --gpus all \
     --env-file .env \
     -v $(pwd)/data:/code/data \
     --entrypoint "/bin/bash" \
     pymap \
     -c "python /code/pymap/scripts/setup.py"
   ```

### Option 3: Using Docker without NVIDIA GPU and NVIDIA Container Toolkit

If you do not have an NVIDIA GPU or the NVIDIA Container Toolkit installed, follow these steps:

1. Build the Docker image:

   ```sh
   docker build -f DockerfileCPU -t pymap .
   ```

2. Run the setup script in a Docker container without GPU support:

   ```sh
   docker run --rm \
     --env-file .env \
     -v $(pwd)/data:/code/data \
     --entrypoint "/bin/bash" \
     pymap \
     -c "python /code/pymap/scripts/setup.py"
   ```

### Running the Application

After setting up the dataset, start the application using Docker Compose:

```sh
docker-compose up
```

After a short while, your application will be live at [http://localhost:3000](http://localhost:3000).
