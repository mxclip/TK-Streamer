#!/bin/bash

# Let the DB start
python /app/app/backend_pre_start.py

# Run migrations
alembic upgrade head

# Create initial data in DB
python /app/app/initial_data.py

# Start server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload 