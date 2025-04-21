import asyncio
import json
import os
import pandas as pd
import zipfile
from datetime import datetime
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Optional

# Conditionally import BLE libraries to handle cloud deployment
try:
    from bleak import BleakScanner, BleakClient

    BLE_AVAILABLE = True
except ImportError:
    BLE_AVAILABLE = False

# Create FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "message": "IMU Service is running!"}


# UUIDs for the IMU service and characteristic
SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214"
CHARACTERISTIC_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214"

# Store active connections
active_connections = {}
test_data = {}


# Data models
class SensorData(BaseModel):
    accX: float
    accY: float
    accZ: float
    gyrX: float
    gyrY: float
    gyrZ: float
    timestamp: str


class TestInfo(BaseModel):
    testId: str
    userId: str
    testerId: str
    exerciseType: str
    exerciseName: str


class ScanResult(BaseModel):
    address: str
    name: str


# API endpoints
@app.get("/scan", response_model=List[ScanResult])
async def scan_devices():
    """Scan for available IMU devices"""
    if not BLE_AVAILABLE:
        return []  # Return empty list when running in cloud environment without BLE

    try:
        devices = await BleakScanner.discover(5.0, return_adv=True)
        imu_devices = []

        for d in devices:
            if devices[d][1].local_name and 'ArduinoIMU' in devices[d][1].local_name:
                imu_devices.append(ScanResult(address=d, name=devices[d][1].local_name))

        return imu_devices
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error scanning for devices: {str(e)}")


@app.post("/connect/{device_address}")
async def connect_device(device_address: str, background_tasks: BackgroundTasks):
    """Connect to an IMU device"""
    if not BLE_AVAILABLE:
        raise HTTPException(status_code=503, detail="BLE functionality not available in this environment")

    if device_address in active_connections:
        return {"status": "already_connected", "message": f"Already connected to {device_address}"}

    try:
        background_tasks.add_task(connect_and_monitor, device_address)
        return {"status": "connecting", "message": f"Connecting to {device_address}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error connecting to device: {str(e)}")


@app.post("/disconnect/{device_address}")
async def disconnect_device(device_address: str):
    """Disconnect from an IMU device"""
    if not BLE_AVAILABLE:
        raise HTTPException(status_code=503, detail="BLE functionality not available in this environment")

    if device_address not in active_connections:
        raise HTTPException(status_code=404, detail=f"Not connected to {device_address}")

    try:
        client = active_connections[device_address]["client"]
        if client and client.is_connected:
            await client.disconnect()

        active_connections.pop(device_address)
        return {"status": "disconnected", "message": f"Disconnected from {device_address}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error disconnecting from device: {str(e)}")


@app.post("/start-test")
async def start_test(test_info: TestInfo):
    """Start a new test"""
    test_id = test_info.testId

    if test_id in test_data:
        return {"status": "already_started", "message": f"Test {test_id} already started"}

    test_data[test_id] = {
        "userId": test_info.userId,
        "testerId": test_info.testerId,
        "exercises": {},
        "current_exercise": {
            "type": test_info.exerciseType,
            "name": test_info.exerciseName
        },
        "start_time": datetime.now().isoformat(),
        "data": []
    }

    return {"status": "started", "message": f"Test {test_id} started"}


@app.post("/end-exercise")
async def end_exercise(test_info: TestInfo):
    """End the current exercise and save data"""
    test_id = test_info.testId

    if test_id not in test_data:
        raise HTTPException(status_code=404, detail=f"Test {test_id} not found")

    current = test_data[test_id]["current_exercise"]
    exercise_key = f"{current['type']}_{current['name']}"

    if test_data[test_id]["data"]:
        os.makedirs(f"data/{test_id}", exist_ok=True)
        df = pd.DataFrame(test_data[test_id]["data"])

        df["accX"] *= 9.81
        df["accY"] *= 9.81
        df["accZ"] *= 9.81
        df["gyrX"] *= (3.14159 / 180)
        df["gyrY"] *= (3.14159 / 180)
        df["gyrZ"] *= (3.14159 / 180)

        df["exercise_type"] = current["type"]
        df["exercise_name"] = current["name"]

        csv_path = f"data/{test_id}/{exercise_key}.csv"
        df.to_csv(csv_path, index=False)

        test_data[test_id]["exercises"][exercise_key] = {
            "type": current["type"],
            "name": current["name"],
            "csv_path": csv_path
        }

    test_data[test_id]["current_exercise"] = {
        "type": test_info.exerciseType,
        "name": test_info.exerciseName
    }
    test_data[test_id]["data"] = []

    return {
        "status": "exercise_completed",
        "message": f"Exercise {current['name']} completed",
        "exercise_key": exercise_key
    }


@app.post("/end-test/{test_id}")
async def end_test(test_id: str, background_tasks: BackgroundTasks):
    """End the test and create a zip file with all data"""
    if test_id not in test_data:
        raise HTTPException(status_code=404, detail=f"Test {test_id} not found")

    if test_data[test_id]["data"]:
        current = test_data[test_id]["current_exercise"]
        exercise_key = f"{current['type']}_{current['name']}"

        df = pd.DataFrame(test_data[test_id]["data"])
        df["accX"] *= 9.81
        df["accY"] *= 9.81
        df["accZ"] *= 9.81
        df["gyrX"] *= (3.14159 / 180)
        df["gyrY"] *= (3.14159 / 180)
        df["gyrZ"] *= (3.14159 / 180)
        df["exercise_type"] = current["type"]
        df["exercise_name"] = current["name"]

        os.makedirs(f"data/{test_id}", exist_ok=True)
        csv_path = f"data/{test_id}/{exercise_key}.csv"
        df.to_csv(csv_path, index=False)

        test_data[test_id]["exercises"][exercise_key] = {
            "type": current["type"],
            "name": current["name"],
            "csv_path": csv_path
        }

    background_tasks.add_task(create_zip_file, test_id)
    return {"status": "test_completed", "message": f"Test {test_id} completed"}


@app.get("/download/{test_id}")
async def get_download_url(test_id: str):
    """Get the URL for downloading the test data zip file"""
    zip_path = f"data/{test_id}/test_data.zip"
    if not os.path.exists(zip_path):
        raise HTTPException(status_code=404, detail=f"Zip file for test {test_id} not found")
    return {"download_url": f"/api/download/{test_id}"}


@app.get("/api/download/{test_id}")
async def download_zip(test_id: str):
    """Serve the zip file directly"""
    zip_path = f"data/{test_id}/test_data.zip"
    if not os.path.exists(zip_path):
        raise HTTPException(status_code=404, detail="Zip file not found")
    return FileResponse(zip_path, media_type='application/zip', filename=f"{test_id}_data.zip")


# Helper functions
async def connect_and_monitor(device_address: str):
    if not BLE_AVAILABLE:
        return

    try:
        client = BleakClient(device_address)
        await client.connect()

        if not client.is_connected:
            raise Exception(f"Failed to connect to {device_address}")

        print(f"[INFO] Connected to {device_address}")
        active_connections[device_address] = {
            "client": client,
            "connected_at": datetime.now().isoformat()
        }

        service = client.services.get_service(SERVICE_UUID)
        characteristic = service.get_characteristic(CHARACTERISTIC_UUID)

        while client.is_connected:
            try:
                raw_data = await client.read_gatt_char(characteristic)
                json_str = raw_data.decode('utf-8')
                imu_data = json.loads(json_str)
                imu_data['timestamp'] = datetime.now().isoformat()

                for test_id in test_data:
                    test_data[test_id]["data"].append(imu_data)

                await asyncio.sleep(0.1)
            except Exception as e:
                print(f"Error reading data: {e}")
                await asyncio.sleep(1)
    except Exception as e:
        print(f"Connection error: {e}")
    finally:
        if device_address in active_connections:
            active_connections.pop(device_address)


async def create_zip_file(test_id: str):
    if test_id not in test_data:
        return

    test_dir = f"data/{test_id}"
    zip_path = f"{test_dir}/test_data.zip"

    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for exercise_key, exercise_info in test_data[test_id]["exercises"].items():
            csv_path = exercise_info["csv_path"]
            if os.path.exists(csv_path):
                zipf.write(csv_path, os.path.basename(csv_path))

    test_data[test_id]["zip_path"] = zip_path
    test_data[test_id]["end_time"] = datetime.now().isoformat()


# Start the application
if __name__ == "__main__":
    import uvicorn

    # Use Render's provided port or default to 8000
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)