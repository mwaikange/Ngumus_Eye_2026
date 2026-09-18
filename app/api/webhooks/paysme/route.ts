import { createHmac, timingSafeEqual } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

const PAYSME_MERCHANT_ID = "ae4dc707-394b-43cc-9610-0e7eaed46bdb"
const INVOICE_PATTERN = /^NGUMU__([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})__([a-z0-9_]+)__([0-9]{8})$/i

function validSignature(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader?.startsWith("sha256=")) return false

  const receivedHex = signatureHeader.slice("sha256=".length)
  if (!/^[0-9a-f]{64}$/i.test(receivedHex)) return false

  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"), "hex")
  const received = Buffer.from(receivedHex, "hex")
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export async function POST(request: Request) {
  const webhookSecret = process.env.PAYSME_WEBHOOK_SECRET
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdkeamquekkpalauorpk.supabase.co"

  if (!webhookSecret || !serviceRoleKey) {
    console.error("PaySME webhook is missing server environment variables")
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 })
  }

  const rawBody = await request.text()
  if (!validSignature(rawBody, request.headers.get("x-paysme-signature"), webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (payload.event !== "payment.paid" || payload.status !== "paid") {
    return NextResponse.json({ received: true, ignored: true })
  }

  if (payload.merchant_id !== PAYSME_MERCHANT_ID) {
    return NextResponse.json({ error: "Unexpected merchant" }, { status: 400 })
  }

  const invoiceId = String(payload.invoice_id || "")
  const invoice = INVOICE_PATTERN.exec(invoiceId)
  if (!invoice) {
    return NextResponse.json({ error: "Invalid Ngumu invoice reference" }, { status: 400 })
  }

  const amount = Number(payload.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid paid amount" }, { status: 400 })
  }

  const transactionId = String(payload.transaction_id || "")
  if (!transactionId) {
    return NextResponse.json({ error: "Missing transaction ID" }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.rpc("fulfill_paysme_payment", {
    p_transaction_id: transactionId,
    p_generated_code: String(payload.generated_code || ""),
    p_invoice_id: invoiceId,
    p_user_id: invoice[1],
    p_plan_code: invoice[2],
    p_amount_cents: Math.round(amount * 100),
    p_currency: String(payload.currency || ""),
    p_paid_at: payload.paid_at ? String(payload.paid_at) : new Date().toISOString(),
    p_payload: payload,
  })

  if (error) {
    console.error("PaySME fulfilment failed", error.message)
    return NextResponse.json({ error: "Payment fulfilment failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true, fulfillment: data })
}
