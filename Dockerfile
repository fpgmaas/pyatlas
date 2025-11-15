# syntax=docker/dockerfile:1

FROM python:3.10-slim-bookworm

ENV uv_VERSION=1.6 \
    uv_VIRTUALENVS_CREATE=false

# Install uv and clean up
RUN pip install "uv==$uv_VERSION" && \
    rm -rf /root/.cache/pip

# Set work directory
WORKDIR /code

# Copy only requirements to cache them in docker layer
COPY uv.lock pyproject.toml /code/

# Install project dependencies and clean up
RUN uv install --no-interaction --no-ansi --no-root --no-dev && \
    rm -rf /root/.cache/pip

# Copy Python code to the Docker image
COPY pylens /code/pylens/

# Copy TOML config files
COPY config.dev.toml config.prod.toml /code/

# Make empty data directory
RUN mkdir -p /code/data

ENV PYTHONPATH=/code

# Use the script as the entrypoint
CMD ["uvicorn", "pylens.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
