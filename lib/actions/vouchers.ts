"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function redeemVoucher(voucherCode: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Call the database function to redeem voucher
  const { data, error } = await supabase.rpc("redeem_voucher", {
    voucher_code: voucherCode,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/profile")

  return { data }
}

export async function generateVoucher(planId: number, email: string, days?: number) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Check admin privileges
  const { data: profile } = await supabase.from("profiles").select("level").eq("id", user.id).single()

  if (!profile || profile.level < 4) {
    return { error: "Insufficient permissions" }
  }

  // Generate voucher code
  const { data: plan } = await supabase.from("plans").select("code").eq("id", planId).single()

  if (!plan) {
    return { error: "Invalid plan" }
  }

  const code = `${plan.code.substring(0, 3)}-${Date.now().toString().slice(-5)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

  const { data: voucher, error } = await supabase
    .from("vouchers")
    .insert({
      code,
      plan_id: planId,
      days,
      issued_to_email: email,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/admin/billing")

  return { data: voucher }
}
