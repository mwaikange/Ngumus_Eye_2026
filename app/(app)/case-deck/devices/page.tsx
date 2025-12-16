"use client"

import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { registerDevice, getUserDevices, reportDeviceStolen } from "@/lib/actions/devices"
import { useState, useEffect } from "react"
import { Smartphone, Laptop, Watch, AlertTriangle, CheckCircle2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function DeviceTrackingPage() {
  const [devices, setDevices] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deviceType, setDeviceType] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    loadDevices()
  }, [])

  async function loadDevices() {
    const result = await getUserDevices()
    if (result.devices) {
      setDevices(result.devices)
    }
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await registerDevice(formData)
    setLoading(false)

    if (result.success) {
      toast({ title: "Device registered!", description: "Your device has been added successfully" })
      setShowForm(false)
      setDeviceType("")
      loadDevices()
    } else {
      toast({ title: "Error", description: result.error || "Failed to register device", variant: "destructive" })
    }
  }

  async function handleReportStolen(deviceId: string) {
    if (confirm("Are you sure you want to report this device as stolen?")) {
      const result = await reportDeviceStolen(deviceId)

      if (result.success) {
        toast({ title: "Device reported", description: "Your device has been marked as stolen" })
        loadDevices()
      } else {
        toast({ title: "Error", description: result.error || "Failed to report device", variant: "destructive" })
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Device Tracking" backHref="/case-deck" />

      <div className="container max-w-4xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tracked Devices</h1>
            <p className="text-muted-foreground">Register and monitor your devices</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Register Device
          </Button>
        </div>

        {/* Register Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Register New Device</CardTitle>
              <CardDescription>Add a device to track and protect</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="deviceName">Device Name *</Label>
                    <Input id="deviceName" name="deviceName" placeholder="My iPhone 14" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deviceType">Device Type *</Label>
                    <Select name="deviceType" value={deviceType} onValueChange={setDeviceType} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="tablet">Tablet</SelectItem>
                        <SelectItem value="laptop">Laptop</SelectItem>
                        <SelectItem value="watch">Smart Watch</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="imei">IMEI (Optional)</Label>
                    <Input id="imei" name="imei" placeholder="123456789012345" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serialNumber">Serial Number (Optional)</Label>
                    <Input id="serialNumber" name="serialNumber" placeholder="ABC123XYZ" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Registering..." : "Register Device"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Device List */}
        <div className="space-y-4">
          {devices.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No devices registered yet</p>
              </CardContent>
            </Card>
          ) : (
            devices.map((device) => <DeviceCard key={device.id} device={device} onReportStolen={handleReportStolen} />)
          )}
        </div>
      </div>
    </div>
  )
}

function DeviceCard({ device, onReportStolen }: { device: any; onReportStolen: (id: string) => void }) {
  const iconMap = {
    phone: Smartphone,
    tablet: Smartphone,
    laptop: Laptop,
    watch: Watch,
    other: Smartphone,
  }

  const Icon = iconMap[device.device_type as keyof typeof iconMap] || Smartphone

  const statusConfig = {
    active: { color: "bg-green-100 text-green-800", label: "Active", icon: CheckCircle2 },
    stolen: { color: "bg-red-100 text-red-800", label: "Stolen", icon: AlertTriangle },
    lost: { color: "bg-yellow-100 text-yellow-800", label: "Lost", icon: AlertTriangle },
    recovered: { color: "bg-blue-100 text-blue-800", label: "Recovered", icon: CheckCircle2 },
  }

  const config = statusConfig[device.status as keyof typeof statusConfig] || statusConfig.active
  const StatusIcon = config.icon

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Icon className="h-6 w-6 text-muted-foreground mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold">{device.device_name}</h3>
                <Badge className={config.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
              </div>
              <div className="grid gap-1 text-sm text-muted-foreground">
                {device.imei && <p>IMEI: {device.imei}</p>}
                {device.serial_number && <p>Serial: {device.serial_number}</p>}
                {device.reported_stolen_at && (
                  <p className="text-destructive">
                    Reported stolen: {new Date(device.reported_stolen_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
          {device.status === "active" && (
            <Button variant="destructive" size="sm" onClick={() => onReportStolen(device.id)}>
              Report Stolen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
