FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry

# Copy poetry files
COPY pyproject.toml poetry.lock* ./

# Configure poetry
RUN poetry config virtualenvs.create false

# Install dependencies
RUN poetry install --no-dev

# Copy application
COPY . .

# Make sure scripts are executable
RUN chmod +x ./prestart.sh

# Expose port
EXPOSE 8000

# Run prestart script then start application
CMD ["./prestart.sh"] 