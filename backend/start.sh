#!/bin/bash
pip install -r requirements.txt
uvicorn imu_service:app --host 0.0.0.0 --port 8000
