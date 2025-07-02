#!/bin/bash
export PYTHONPATH=/Users/wenxindou/Desktop/MX/TK\ Streamer/backend:$PYTHONPATH
cd /Users/wenxindou/Desktop/MX/TK\ Streamer/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
