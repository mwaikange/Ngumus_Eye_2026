"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getUserDevices() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: devices, error } = await supabase
    .from("tracked_devices")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching devices:", error)
    return { error: error.message }
  }

  return { devices }
}

export async function registerDevice(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const deviceName = formData.get("deviceName") as string
  const deviceType = formData.get("deviceType") as string
  const imei = formData.get("imei") as string
  const serialNumber = formData.get("serialNumber") as string

  const { error } = await supabase.from("tracked_devices").insert({
    user_id: user.id,
    device_name: deviceName,
    device_type: deviceType,
    imei,
    serial_number: serialNumber,
    status: "active",
  })

  if (error) {
    console.error("[v0] Error registering device:", error)
    return { error: error.message }
  }

  revalidatePath("/case-deck/devices")

  return { success: true, message: "Device registered successfully!" }
}

export async function reportDeviceStolen(deviceId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("tracked_devices")
    .update({
      status: "stolen",
      reported_stolen_at: new Date().toISOString(),
    })
    .eq("id", deviceId)
    .eq("user_id", user.id)

  if (error) {
    console.error("[v0] Error reporting device stolen:", error)
    return { error: error.message }
  }

  revalidatePath("/case-deck/devices")

  return { success: true, message: "Device reported as stolen" }
}
