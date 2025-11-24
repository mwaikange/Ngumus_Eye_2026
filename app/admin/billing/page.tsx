"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { generateVoucher } from "@/lib/actions/vouchers"
import { Ticket, Plus, Search } from "lucide-react"

interface Plan {
  id: number
  code: string
  label: string
  period_days: number
  price_cents: number
}

interface Voucher {
  code: string
  plan_id: number
  days: number | null
  issued_to_email: string | null
  redeemed_by: string | null
  redeemed_at: string | null
  plans: Plan
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    planId: "",
    email: "",
    days: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const { data: plansData } = await supabase.from("plans").select("*").order("price_cents", { ascending: true })

      const { data: vouchersData } = await supabase
        .from("vouchers")
        .select("*, plans(*)")
        .order("code", { ascending: false })
        .limit(50)

      if (plansData) setPlans(plansData)
      if (vouchersData) setVouchers(vouchersData as any)
    }

    fetchData()
  }, [])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)
    setError(null)
    setSuccess(null)

    const result = await generateVoucher(
      Number.parseInt(formData.planId),
      formData.email,
      formData.days ? Number.parseInt(formData.days) : undefined,
    )

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(`Voucher generated: ${result.data?.code}`)
      setFormData({ planId: "", email: "", days: "" })

      // Refresh vouchers list
      const supabase = createClient()
      const { data: vouchersData } = await supabase
        .from("vouchers")
        .select("*, plans(*)")
        .order("code", { ascending: false })
        .limit(50)
      if (vouchersData) setVouchers(vouchersData as any)
    }

    setIsGenerating(false)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscriptions & Vouchers</h1>
        <p className="text-muted-foreground">Manage subscription plans and voucher codes</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Plans */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Plans</CardTitle>
            <CardDescription>Available membership packages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {plans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{plan.label}</p>
                  <p className="text-sm text-muted-foreground">{plan.period_days} days</p>
                </div>
                <Badge variant="outline">N${(plan.price_cents / 100).toFixed(2)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Generate Voucher */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Voucher</CardTitle>
            <CardDescription>Create a new subscription voucher code</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plan">Plan</Label>
                <Select value={formData.planId} onValueChange={(value) => setFormData({ ...formData, planId: value })}>
                  <SelectTrigger id="plan">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        {plan.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="recipient@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="days">Custom Days (Optional)</Label>
                <Input
                  id="days"
                  type="number"
                  placeholder="Override plan duration"
                  value={formData.days}
                  onChange={(e) => setFormData({ ...formData, days: e.target.value })}
                  min="1"
                />
              </div>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

              {success && <div className="text-sm text-green-600 bg-green-500/10 p-3 rounded-md">{success}</div>}

              <Button type="submit" className="w-full" disabled={!formData.planId || isGenerating}>
                <Plus className="h-4 w-4 mr-2" />
                {isGenerating ? "Generating..." : "Generate Voucher"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Vouchers List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Voucher Codes</CardTitle>
              <CardDescription>Recently generated vouchers</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search vouchers..." className="pl-9 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {vouchers.length > 0 ? (
              vouchers.map((voucher) => (
                <div key={voucher.code} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Ticket className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-mono font-medium">{voucher.code}</p>
                      <p className="text-sm text-muted-foreground">
                        {voucher.plans.label}
                        {voucher.days && ` • ${voucher.days} days`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {voucher.redeemed_by ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-700">
                        Redeemed
                      </Badge>
                    ) : (
                      <Badge variant="outline">Available</Badge>
                    )}
                    {voucher.issued_to_email && (
                      <p className="text-xs text-muted-foreground mt-1">{voucher.issued_to_email}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">No vouchers generated yet</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
