import os
import asyncio
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import Dict, List
import pandas as pd
import re

try:
    from bleak import BleakScanner, BleakClient
    BLE_AVAILABLE = True
except ImportError:
    BLE_AVAILABLE = False

SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
CHARACTERISTIC_UUID = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

app = FastAPI()
active_connections: Dict[str, Dict] = {}
test_data: Dict[str, Dict] = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def parse_imu_string(data_str):
    parsed = {}
    matches = re.findall(r'([A-Z]{2}):([-]?\d+\.\d+)', data_str)
    key_map = {
        'AX': 'accX', 'AY': 'accY', 'AZ': 'accZ',
        'GX': 'gyrX', 'GY': 'gyrY', 'GZ': 'gyrZ',
        'MX': 'magX', 'MY': 'magY', 'MZ': 'magZ'
    }

    for label, value in matches:
        if label in key_map:
            parsed[key_map[label]] = float(value)

    battery_match = re.search(r'Battery:\s*(\d+)%', data_str)
    parsed['Battery'] = int(battery_match.group(1)) if battery_match else 0

    for field in ['accX', 'accY', 'accZ', 'gyrX', 'gyrY', 'gyrZ', 'magX', 'magY', 'magZ', 'Battery']:
        parsed.setdefault(field, 0)

    return parsed


@app.get("/api/devices")
async def scan_ble_devices():
    if not BLE_AVAILABLE:
        raise HTTPException(status_code=500, detail="BLE is not available")

    devices = await BleakScanner.discover(timeout=5.0)
    device_list = []

    for device in devices:
        if device.name and 'Nordic_UART' in device.name:
            device_list.append({
                "name": device.name,
                "address": device.address,
                "rssi": device.rssi
            })

    return device_list


@app.post("/api/start_test")
async def start_test(device_addresses: List[str] = Query(...)):
    if not BLE_AVAILABLE:
        raise HTTPException(status_code=500, detail="BLE is not available")

    test_id = f"test_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    test_data[test_id] = {
        "start_time": datetime.now().isoformat(),
        "data": []
    }

    for address in device_addresses:
        asyncio.create_task(connect_and_monitor(address, test_id))

    return {"message": "Test started", "test_id": test_id}


async def connect_and_monitor(address, test_id):
    if not BLE_AVAILABLE:
        return

    try:
        async with BleakClient(address, timeout=60.0) as client:
            await client.is_connected()
            print(f"Connected to {address}")
            csv_file = f"imu_data_{address.replace(':', '_')}.csv"

            pd.DataFrame([{
                'accX': 0, 'accY': 0, 'accZ': 0,
                'gyrX': 0, 'gyrY': 0, 'gyrZ': 0,
                'magX': 0, 'magY': 0, 'magZ': 0,
                'Battery': 0,
                'Timestamp': ''
            }]).to_csv(csv_file, index=False)

            def notification_handler(sender, data):
                try:
                    text = data.decode('utf-8').strip()
                    print(f"Raw IMU text from {address}: {text}")
                    imu_data = parse_imu_string(text)
                    imu_data['Timestamp'] = datetime.now().isoformat()

                    pd.DataFrame([imu_data]).to_csv(csv_file, mode='a', header=False, index=False)
                    test_data[test_id]["data"].append(imu_data)

                except Exception as e:
                    print(f"Error in notification handler for {address}: {e}")

            await client.start_notify(CHARACTERISTIC_UUID, notification_handler)

            active_connections[address] = {
                "client": client,
                "connected_at": datetime.now().isoformat(),
                "mock": False
            }

            while True:
                await asyncio.sleep(1)

    except Exception as e:
        print(f"Error in monitoring {address}: {e}")


@app.get("/api/test_data/{test_id}")
async def get_test_data(test_id: str):
    if test_id in test_data:
        return test_data[test_id]
    raise HTTPException(status_code=404, detail="Test ID not found")
