import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("incidents")
      .select(
        `
        id,
        title,
        lat,
        lng,
        town,
        severity,
        area_radius_m,
        created_at,
        verified_expiry,
        expires_at,
        upvotes,
        verification_level,
        incident_types!type_id (
          label,
          severity
        )
      `,
      )
      .eq("admin_verified", true)
      .not("lat", "is", null)
      .not("lng", "is", null)
      .gt("verified_expiry", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: CORS_HEADERS },
      )
    }

    const incidents = (data ?? []).map((row: any) => ({
      id: row.id,
      title: row.title,
      lat: row.lat,
      lng: row.lng,
      town: row.town ?? null,
      severity: row.severity ?? null,
      area_radius_m: row.area_radius_m ?? null,
      created_at: row.created_at,
      verified_expiry: row.verified_expiry ?? null,
      expires_at: row.expires_at ?? null,
      upvotes: row.upvotes ?? 0,
      verification_level: row.verification_level ?? 0,
      type_label: row.incident_types?.label ?? null,
      type_severity: row.incident_types?.severity ?? null,
    }))

    return NextResponse.json(incidents, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "no-store",
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500, headers: CORS_HEADERS },
    )
  }
}
