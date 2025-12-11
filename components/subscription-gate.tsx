"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"
import Link from "next/link"

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAccess()
  }, [])

  async function checkAccess() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/login")
      return
    }

    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gte("expires_at", new Date().toISOString())
      .maybeSingle()

    setHasAccess(!!subscription)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Subscription Required</CardTitle>
            <CardDescription>You need an active subscription to access My Case Deck</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Subscribe now to unlock access to file management, device tracking, counseling support, and more premium
              features.
            </p>
            <Link href="/subscribe">
              <Button className="w-full">View Membership Plans</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
