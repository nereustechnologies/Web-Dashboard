"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Bluetooth, AlertCircle, Check, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { IMUClient, type ScanResult } from "@/lib/imu-client"

interface BluetoothConnectorProps {
  onConnected: (device: ScanResult) => void
}

export function BluetoothConnector({ onConnected }: BluetoothConnectorProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<ScanResult[]>([])
  const [selectedDevice, setSelectedDevice] = useState<ScanResult | null>(null)
  const [connecting, setConnecting] = useState(false)

  const handleScan = async () => {
    setIsScanning(true)
    setError(null)

    try {
      const results = await IMUClient.scanDevices()
      setDevices(results)

      if (results.length === 0) {
        setError("No IMU devices found. Make sure your devices are powered on and in range.")
      }
    } catch (err: any) {
      console.error("Scan error:", err)
      setError(err.message || "Failed to scan for Bluetooth devices")
    } finally {
      setIsScanning(false)
    }
  }

  const handleConnect = async (device: ScanResult) => {
    setConnecting(true)
    setError(null)

    try {
      await IMUClient.connectDevice(device.address)
      setSelectedDevice(device)
      onConnected(device)
    } catch (err: any) {
      console.error("Connection error:", err)
      setError(err.message || "Failed to connect to device")
    } finally {
      setConnecting(false)
    }
  }

  // Initial scan on component mount
  useEffect(() => {
    handleScan()
  }, [])

  return (
    <Card className="border-[#00D4EF]/20">
      <CardHeader>
        <CardTitle>Connect IMU Sensor</CardTitle>
        <CardDescription>Connect to an IMU sensor via Bluetooth to start collecting data</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {selectedDevice ? (
          <div className="flex items-center gap-2 p-4 border border-green-500/20 rounded-md bg-green-500/10">
            <Check className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium">Connected to {selectedDevice.name || "IMU Device"}</p>
              <p className="text-sm text-muted-foreground">Device ID: {selectedDevice.address}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Available Devices</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleScan}
                disabled={isScanning}
                className="flex items-center gap-1"
              >
                {isScanning ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                {isScanning ? "Scanning..." : "Refresh"}
              </Button>
            </div>

            {devices.length > 0 ? (
              <div className="space-y-2">
                {devices.map((device) => (
                  <div
                    key={device.address}
                    className="flex items-center justify-between p-3 border border-[#00D4EF]/20 rounded-md hover:bg-[#00D4EF]/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Bluetooth className="h-4 w-4 text-[#00D4EF]" />
                      <div>
                        <p className="font-medium">{device.name || "Unknown Device"}</p>
                        <p className="text-xs text-muted-foreground">{device.address}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleConnect(device)}
                      disabled={connecting}
                      className="bg-[#00D4EF] text-black hover:bg-[#00D4EF]/90"
                    >
                      {connecting ? "Connecting..." : "Connect"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 p-8">
                <Bluetooth className="h-12 w-12 text-[#00D4EF]" />
                <p className="text-center text-muted-foreground">
                  {isScanning
                    ? "Scanning for IMU sensors..."
                    : "No IMU sensors found. Click the button below to scan for available devices."}
                </p>
                <Button
                  onClick={handleScan}
                  disabled={isScanning}
                  className="bg-[#00D4EF] text-black hover:bg-[#00D4EF]/90"
                >
                  {isScanning ? "Scanning..." : "Scan for IMU Sensors"}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-xs text-muted-foreground">
          Note: Make sure Bluetooth is enabled on your device and the IMU sensor is powered on.
        </p>
      </CardFooter>
    </Card>
  )
}
