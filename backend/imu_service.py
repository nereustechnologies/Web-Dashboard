import asyncio
import json
import os
import pandas as pd
import zipfile
from datetime import datetime
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Optional

# Detect if we're running in a cloud environment (like Render)
IN_CLOUD = os.environ.get('RENDER', False) or os.environ.get('RAILWAY', False)

# Conditionally import BLE libraries
BLE_AVAILABLE = False
if not IN_CLOUD:
    try:
        from bleak import BleakScanner, BleakClient

        BLE_AVAILABLE = True
    except ImportError:
        print("BLE libraries not available, running in limited mode")

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
    return {"status": "ok", "message": "IMU Service is running!", "ble_available": BLE_AVAILABLE}


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
    # When in cloud or BLE not available, return mock devices for testing
    if IN_CLOUD or not BLE_AVAILABLE:
        print("Running in cloud environment or BLE not available, returning mock devices")
        # Return empty list or mock data for testing
        return [
            ScanResult(address="00:00:00:00:00:01", name="MockIMU_01"),
            ScanResult(address="00:00:00:00:00:02", name="MockIMU_02")
        ]

    try:
        devices = await BleakScanner.discover(5.0, return_adv=True)
        imu_devices = []

        for d in devices:
            if devices[d][1].local_name and 'ArduinoIMU' in devices[d][1].local_name:
                imu_devices.append(ScanResult(address=d, name=devices[d][1].local_name))

        return imu_devices
    except Exception as e:
        print(f"Error scanning for devices: {str(e)}")
        # Return empty list instead of raising exception
        return []


@app.post("/connect/{device_address}")
async def connect_device(device_address: str, background_tasks: BackgroundTasks):
    """Connect to an IMU device"""
    if IN_CLOUD or not BLE_AVAILABLE:
        # Mock connection for cloud environment
        active_connections[device_address] = {
            "client": None,
            "connected_at": datetime.now().isoformat(),
            "mock": True
        }
        return {"status": "connected", "message": f"Mock connected to {device_address}"}

    if device_address in active_connections:
        return {"status": "already_connected", "message": f"Already connected to {device_address}"}

    try:
        background_tasks.add_task(connect_and_monitor, device_address)
        return {"status": "connecting", "message": f"Connecting to {device_address}"}
    except Exception as e:
        print(f"Connection error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Error connecting to device: {str(e)}"}
        )


@app.post("/disconnect/{device_address}")
async def disconnect_device(device_address: str):
    """Disconnect from an IMU device"""
    if device_address not in active_connections:
        return {"status": "not_connected", "message": f"Not connected to {device_address}"}

    try:
        # For mock connections or cloud environment
        if IN_CLOUD or not BLE_AVAILABLE or active_connections[device_address].get("mock", False):
            active_connections.pop(device_address)
            return {"status": "disconnected", "message": f"Disconnected from {device_address}"}

        # For real connections
        client = active_connections[device_address]["client"]
        if client and client.is_connected:
            await client.disconnect()

        active_connections.pop(device_address)
        return {"status": "disconnected", "message": f"Disconnected from {device_address}"}
    except Exception as e:
        print(f"Disconnection error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Error disconnecting from device: {str(e)}"}
        )


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

    # For cloud/mock environment, add some mock data
    if IN_CLOUD or not BLE_AVAILABLE:
        # Generate some mock IMU data
        for i in range(100):
            test_data[test_id]["data"].append({
                "accX": 0.1 * i % 10,
                "accY": 0.2 * i % 10,
                "accZ": 9.8 + (0.05 * i % 10),
                "gyrX": 0.01 * i % 5,
                "gyrY": 0.02 * i % 5,
                "gyrZ": 0.03 * i % 5,
                "timestamp": (datetime.now() + datetime.timedelta(milliseconds=i * 10)).isoformat()
            })

    return {"status": "started", "message": f"Test {test_id} started"}


@app.post("/end-exercise")
async def end_exercise(test_info: TestInfo):
    """End the current exercise and save data"""
    test_id = test_info.testId

    if test_id not in test_data:
        return JSONResponse(
            status_code=404,
            content={"status": "not_found", "message": f"Test {test_id} not found"}
        )

    current = test_data[test_id]["current_exercise"]
    exercise_key = f"{current['type']}_{current['name']}"

    if test_data[test_id]["data"]:
        os.makedirs(f"data/{test_id}", exist_ok=True)

        try:
            df = pd.DataFrame(test_data[test_id]["data"])

            # Convert units
            df["accX"] = df["accX"].astype(float) * 9.81
            df["accY"] = df["accY"].astype(float) * 9.81
            df["accZ"] = df["accZ"].astype(float) * 9.81
            df["gyrX"] = df["gyrX"].astype(float) * (3.14159 / 180)
            df["gyrY"] = df["gyrY"].astype(float) * (3.14159 / 180)
            df["gyrZ"] = df["gyrZ"].astype(float) * (3.14159 / 180)

            df["exercise_type"] = current["type"]
            df["exercise_name"] = current["name"]

            csv_path = f"data/{test_id}/{exercise_key}.csv"
            df.to_csv(csv_path, index=False)

            test_data[test_id]["exercises"][exercise_key] = {
                "type": current["type"],
                "name": current["name"],
                "csv_path": csv_path
            }
        except Exception as e:
            print(f"Error processing data: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={"status": "error", "message": f"Error processing data: {str(e)}"}
            )

    test_data[test_id]["current_exercise"] = {
        "type": test_info.exerciseType,
        "name": test_info.exerciseName
    }
    test_data[test_id]["data"] = []

    # Add mock data for next exercise if needed
    if IN_CLOUD or not BLE_AVAILABLE:
        for i in range(100):
            test_data[test_id]["data"].append({
                "accX": 0.1 * i % 10,
                "accY": 0.2 * i % 10,
                "accZ": 9.8 + (0.05 * i % 10),
                "gyrX": 0.01 * i % 5,
                "gyrY": 0.02 * i % 5,
                "gyrZ": 0.03 * i % 5,
                "timestamp": (datetime.now() + datetime.timedelta(milliseconds=i * 10)).isoformat()
            })

    return {
        "status": "exercise_completed",
        "message": f"Exercise {current['name']} completed",
        "exercise_key": exercise_key
    }


@app.post("/end-test/{test_id}")
async def end_test(test_id: str, background_tasks: BackgroundTasks):
    """End the test and create a zip file with all data"""
    if test_id not in test_data:
        return JSONResponse(
            status_code=404,
            content={"status": "not_found", "message": f"Test {test_id} not found"}
        )

    if test_data[test_id]["data"]:
        current = test_data[test_id]["current_exercise"]
        exercise_key = f"{current['type']}_{current['name']}"

        try:
            os.makedirs(f"data/{test_id}", exist_ok=True)
            df = pd.DataFrame(test_data[test_id]["data"])

            # Convert units
            df["accX"] = df["accX"].astype(float) * 9.81
            df["accY"] = df["accY"].astype(float) * 9.81
            df["accZ"] = df["accZ"].astype(float) * 9.81
            df["gyrX"] = df["gyrX"].astype(float) * (3.14159 / 180)
            df["gyrY"] = df["gyrY"].astype(float) * (3.14159 / 180)
            df["gyrZ"] = df["gyrZ"].astype(float) * (3.14159 / 180)

            df["exercise_type"] = current["type"]
            df["exercise_name"] = current["name"]

            csv_path = f"data/{test_id}/{exercise_key}.csv"
            df.to_csv(csv_path, index=False)

            test_data[test_id]["exercises"][exercise_key] = {
                "type": current["type"],
                "name": current["name"],
                "csv_path": csv_path
            }
        except Exception as e:
            print(f"Error processing final data: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={"status": "error", "message": f"Error processing final data: {str(e)}"}
            )

    try:
        # Create zip file in the main thread to avoid background task issues
        await create_zip_file(test_id)
        return {"status": "test_completed", "message": f"Test {test_id} completed"}
    except Exception as e:
        print(f"Error creating zip file: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Error creating zip file: {str(e)}"}
        )


@app.get("/download/{test_id}")
async def get_download_url(test_id: str):
    """Get the URL for downloading the test data zip file"""
    zip_path = f"data/{test_id}/test_data.zip"
    if not os.path.exists(zip_path):
        return JSONResponse(
            status_code=404,
            content={"status": "not_found", "message": f"Zip file for test {test_id} not found"}
        )
    return {"download_url": f"/api/download/{test_id}"}


@app.get("/api/download/{test_id}")
async def download_zip(test_id: str):
    """Serve the zip file directly"""
    zip_path = f"data/{test_id}/test_data.zip"
    if not os.path.exists(zip_path):
        return JSONResponse(
            status_code=404,
            content={"status": "not_found", "message": "Zip file not found"}
        )
    return FileResponse(zip_path, media_type='application/zip', filename=f"{test_id}_data.zip")


# Helper functions
async def connect_and_monitor(device_address: str):
    if not BLE_AVAILABLE:
        return

    try:
        client = BleakClient(device_address)
        await client.connect()

        if not client.is_connected:
            print(f"Failed to connect to {device_address}")
            return

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

    try:
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for exercise_key, exercise_info in test_data[test_id]["exercises"].items():
                csv_path = exercise_info["csv_path"]
                if os.path.exists(csv_path):
                    zipf.write(csv_path, os.path.basename(csv_path))

        test_data[test_id]["zip_path"] = zip_path
        test_data[test_id]["end_time"] = datetime.now().isoformat()
    except Exception as e:
        print(f"Error creating zip file: {e}")
        raise


# Start the application
if __name__ == "__main__":
    import uvicorn

    # Use Render's provided port or default to 8000
    port = int(os.environ.get("PORT", 10000))
    print(f"Starting server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)