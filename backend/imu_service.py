import asyncio
import json
import os
import pandas as pd
import zipfile
from datetime import datetime
from bleak import BleakScanner, BleakClient
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional

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
    if device_address in active_connections:
        return {"status": "already_connected", "message": f"Already connected to {device_address}"}
    
    try:
        # Start connection in background
        background_tasks.add_task(connect_and_monitor, device_address)
        return {"status": "connecting", "message": f"Connecting to {device_address}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error connecting to device: {str(e)}")

@app.post("/disconnect/{device_address}")
async def disconnect_device(device_address: str):
    """Disconnect from an IMU device"""
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
    
    # Initialize test data structure
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
    
    # Save current exercise data
    if test_data[test_id]["data"]:
        # Create directory for test data if it doesn't exist
        os.makedirs(f"data/{test_id}", exist_ok=True)
        
        # Convert data to DataFrame and save as CSV
        df = pd.DataFrame(test_data[test_id]["data"])
        
        # Convert to SI units
        df["accX"] = df["accX"] * 9.81  # Convert to m/s²
        df["accY"] = df["accY"] * 9.81  # Convert to m/s²
        df["accZ"] = df["accZ"] * 9.81  # Convert to m/s²
        df["gyrX"] = df["gyrX"] * (3.14159/180)  # Convert to rad/s
        df["gyrY"] = df["gyrY"] * (3.14159/180)  # Convert to rad/s
        df["gyrZ"] = df["gyrZ"] * (3.14159/180)  # Convert to rad/s
        
        # Add exercise metadata
        df["exercise_type"] = current["type"]
        df["exercise_name"] = current["name"]
        
        # Save to CSV
        csv_path = f"data/{test_id}/{exercise_key}.csv"
        df.to_csv(csv_path, index=False)
        
        # Store path in test data
        test_data[test_id]["exercises"][exercise_key] = {
            "type": current["type"],
            "name": current["name"],
            "csv_path": csv_path
        }
    
    # Update current exercise
    test_data[test_id]["current_exercise"] = {
        "type": test_info.exerciseType,
        "name": test_info.exerciseName
    }
    
    # Clear data for next exercise
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
    
    # End the last exercise if there's data
    if test_data[test_id]["data"]:
        current = test_data[test_id]["current_exercise"]
        exercise_key = f"{current['type']}_{current['name']}"
        
        # Save current exercise data
        df = pd.DataFrame(test_data[test_id]["data"])
        
        # Convert to SI units
        df["accX"] = df["accX"] * 9.81  # Convert to m/s²
        df["accY"] = df["accY"] * 9.81  # Convert to m/s²
        df["accZ"] = df["accZ"] * 9.81  # Convert to m/s²
        df["gyrX"] = df["gyrX"] * (3.14159/180)  # Convert to rad/s
        df["gyrY"] = df["gyrY"] * (3.14159/180)  # Convert to rad/s
        df["gyrZ"] = df["gyrZ"] * (3.14159/180)  # Convert to rad/s
        
        # Add exercise metadata
        df["exercise_type"] = current["type"]
        df["exercise_name"] = current["name"]
        
        # Save to CSV
        csv_path = f"data/{test_id}/{exercise_key}.csv"
        df.to_csv(csv_path, index=False)
        
        # Store path in test data
        test_data[test_id]["exercises"][exercise_key] = {
            "type": current["type"],
            "name": current["name"],
            "csv_path": csv_path
        }
    
    # Create zip file in background
    background_tasks.add_task(create_zip_file, test_id)
    
    return {"status": "test_completed", "message": f"Test {test_id} completed"}

@app.get("/download/{test_id}")
async def get_download_url(test_id: str):
    """Get the URL for downloading the test data zip file"""
    zip_path = f"data/{test_id}/test_data.zip"
    
    if not os.path.exists(zip_path):
        raise HTTPException(status_code=404, detail=f"Zip file for test {test_id} not found")
    
    # In a real app, you would generate a signed URL or serve the file directly
    return {"download_url": f"/api/download/{test_id}"}

# Helper functions
async def connect_and_monitor(device_address: str):
    """Connect to a device and monitor its data"""
    try:
        client = BleakClient(device_address)
        await client.connect()
        
        if not client.is_connected:
            raise Exception(f"Failed to connect to {device_address}")
        
        # Store connection
        active_connections[device_address] = {
            "client": client,
            "connected_at": datetime.now().isoformat()
        }
        
        # Start monitoring
        service = client.services.get_service(SERVICE_UUID)
        characteristic = service.get_characteristic(CHARACTERISTIC_UUID)
        
        # Monitor data
        while client.is_connected:
            try:
                raw_data = await client.read_gatt_char(characteristic)
                json_str = raw_data.decode('utf-8')
                imu_data = json.loads(json_str)
                
                # Add timestamp
                imu_data['timestamp'] = datetime.now().isoformat()
                
                # Add data to all active tests
                for test_id in test_data:
                    test_data[test_id]["data"].append(imu_data)
                
                await asyncio.sleep(0.1)  # 10 Hz
            except Exception as e:
                print(f"Error reading data: {e}")
                await asyncio.sleep(1)
        
    except Exception as e:
        print(f"Connection error: {e}")
    finally:
        if device_address in active_connections:
            active_connections.pop(device_address)

async def create_zip_file(test_id: str):
    """Create a zip file with all test data"""
    if test_id not in test_data:
        return
    
    test_dir = f"data/{test_id}"
    zip_path = f"{test_dir}/test_data.zip"
    
    # Create zip file
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for exercise_key, exercise_info in test_data[test_id]["exercises"].items():
            csv_path = exercise_info["csv_path"]
            if os.path.exists(csv_path):
                # Add file to zip with a path relative to the test directory
                zipf.write(csv_path, os.path.basename(csv_path))
    
    # Store zip info in test data
    test_data[test_id]["zip_path"] = zip_path
    test_data[test_id]["end_time"] = datetime.now().isoformat()

# Run the FastAPI app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
