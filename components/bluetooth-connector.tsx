"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Bluetooth, AlertCircle, Check, RefreshCw, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"

interface BluetoothConnectorProps {
  onConnected: (device: BluetoothDevice) => void
}

// Define the service and characteristic UUIDs for the IMU sensor
// These should match the UUIDs used by your IMU device
const IMU_SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
const IMU_CHARACTERISTIC_UUID = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

export function BluetoothConnector({ onConnected }: BluetoothConnectorProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<BluetoothDevice[]>([])
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice | null>(null)
  const [connecting, setConnecting] = useState(false)

  // Check if Web Bluetooth API is supported
  const isWebBluetoothSupported = typeof navigator !== "undefined" && "bluetooth" in navigator

  const handleScan = async () => {
    if (!isWebBluetoothSupported) {
      setError("Web Bluetooth API is not supported in your browser. Please use Chrome, Edge, or Opera.")
      return
    }

    setIsScanning(true)
    setError(null)
    setDevices([])

    try {
      // Request device with the IMU service UUID
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [IMU_SERVICE_UUID] }, { namePrefix: "Nordic_UART" }],
        optionalServices: [IMU_SERVICE_UUID],
      })

      // Add the device to our list
      setDevices((prev) => [...prev, device])

      // Log the discovery to Supabase
      await supabase.from("device_discoveries").insert({
        device_id: device.id,
        device_name: device.name || "Unknown Device",
        discovered_at: new Date().toISOString(),
      })
    } catch (err: any) {
      console.error("Scan error:", err)
      if (err.name === "NotFoundError") {
        setError("No IMU devices found. Make sure your devices are powered on and in range.")
      } else {
        setError(err.message || "Failed to scan for Bluetooth devices")
      }
    } finally {
      setIsScanning(false)
    }
  }

  const handleConnect = async (device: BluetoothDevice) => {
    setConnecting(true)
    setError(null)

    try {
      // Connect to the GATT server
      const server = await device.gatt?.connect()
      if (!server) {
        throw new Error("Failed to connect to GATT server")
      }

      // Get the IMU service
      const service = await server.getPrimaryService(IMU_SERVICE_UUID)

      // Get the IMU characteristic
      const characteristic = await service.getCharacteristic(IMU_CHARACTERISTIC_UUID)

      // Log the connection to Supabase
      await supabase.from("device_connections").insert({
        device_id: device.id,
        device_name: device.name || "Unknown Device",
        connected_at: new Date().toISOString(),
      })

      // Set the selected device
      setSelectedDevice(device)

      // Notify parent component
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
    if (isWebBluetoothSupported) {
      handleScan()
    }
  }, [])

  if (!isWebBluetoothSupported) {
    return (
        <Card className="border-[#00D4EF]/20">
          <CardHeader>
            <CardTitle>Connect IMU Sensor</CardTitle>
            <CardDescription>Web Bluetooth is not supported in your browser</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Browser Not Supported</AlertTitle>
              <AlertDescription>
                Web Bluetooth API is not supported in your browser. Please use Chrome, Edge, or Opera.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
    )
  }

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
                  <p className="text-sm text-muted-foreground">Device ID: {selectedDevice.id}</p>
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

                {isScanning && (
                    <div className="flex flex-col items-center justify-center gap-4 p-8">
                      <div className="relative">
                        <Bluetooth className="h-12 w-12 text-[#00D4EF]" />
                        <div className="absolute inset-0 rounded-full border-4 border-[#00D4EF]/20 animate-ping"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-[#00D4EF]/40 animate-pulse"></div>
                      </div>
                      <p className="text-center text-muted-foreground">Scanning for IMU sensors...</p>
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-[#00D4EF]" />
                        <span className="text-sm">Please make sure your device is in pairing mode</span>
                      </div>
                    </div>
                )}

                {!isScanning && devices.length > 0 ? (
                    <div className="space-y-2">
                      {devices.map((device) => (
                          <div
                              key={device.id}
                              className="flex items-center justify-between p-3 border border-[#00D4EF]/20 rounded-md hover:bg-[#00D4EF]/5 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Bluetooth className="h-4 w-4 text-[#00D4EF]" />
                              <div>
                                <p className="font-medium">{device.name || "Unknown Device"}</p>
                                <p className="text-xs text-muted-foreground">{device.id}</p>
                              </div>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => handleConnect(device)}
                                disabled={connecting}
                                className="bg-[#00D4EF] text-black hover:bg-[#00D4EF]/90"
                            >
                              {connecting ? (
                                  <>
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                    Connecting...
                                  </>
                              ) : (
                                  "Connect"
                              )}
                            </Button>
                          </div>
                      ))}
                    </div>
                ) : (
                    !isScanning && (
                        <div className="flex flex-col items-center justify-center gap-4 p-8">
                          <Bluetooth className="h-12 w-12 text-[#00D4EF]" />
                          <p className="text-center text-muted-foreground">
                            No IMU sensors found. Click the button below to scan for available devices.
                          </p>
                          <Button
                              onClick={handleScan}
                              disabled={isScanning}
                              className="bg-[#00D4EF] text-black hover:bg-[#00D4EF]/90"
                          >
                            {isScanning ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Scanning...
                                </>
                            ) : (
                                "Scan for IMU Sensors"
                            )}
                          </Button>
                        </div>
                    )
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
