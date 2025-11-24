"use client"

import type React from "react"

import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { redeemVoucher } from "@/lib/actions/vouchers"
import { Check, Ticket, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface Plan {
  id: number
  code: string
  label: string
  period_days: number
  price_cents: number
  package_type?: string
  description?: string
  features?: string[]
}

export default function SubscribePage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<any>(null)
  const [voucherCode, setVoucherCode] = useState("")
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const supabase = createClient()

    // Fetch plans
    const { data: plansData } = await supabase.from("plans").select("*").order("price_cents", { ascending: true })
    if (plansData) setPlans(plansData)

    // Check subscription
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: subData } = await supabase
        .from("user_subscriptions")
        .select("*, plans(*)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gte("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .maybeSingle()

      if (subData) setSubscription(subData)
    }
  }

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsRedeeming(true)
    setError(null)

    const result = await redeemVoucher(voucherCode)

    if (result.error) {
      setError(result.error)
      setIsRedeeming(false)
    } else {
      router.push("/case-deck")
    }
  }

  const individual = plans.filter((p) => p.package_type === "individual")
  const family = plans.filter((p) => p.package_type === "family")
  const tourist = plans.filter((p) => p.package_type === "tourist")

  const defaultFeatures = [
    "Incident reporting",
    "Community groups",
    "Case management",
    "24/7 support",
    "Priority response",
    "Evidence vault storage",
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <AppHeader title="Membership Packages" />

      <div className="container max-w-6xl px-4 py-6 space-y-8">
        {subscription && (
          <Card className="bg-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Active Subscription</CardTitle>
              <CardDescription>You currently have an active {subscription.plans?.label} subscription</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <p className="font-medium">Expires: {new Date(subscription.expires_at).toLocaleDateString()}</p>
                  <p className="text-muted-foreground">
                    {Math.ceil(
                      (new Date(subscription.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                    )}{" "}
                    days remaining
                  </p>
                </div>
                <a href="/case-deck">
                  <Button>Go to My Case Deck</Button>
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {individual.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Individual Plans</h2>
              <p className="text-muted-foreground">Perfect for personal safety and security</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {individual.map((plan) => (
                <PackageCard key={plan.id} plan={plan} features={defaultFeatures} />
              ))}
            </div>
          </div>
        )}

        {family.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Family Plans</h2>
              <p className="text-muted-foreground">Protect your whole family together</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {family.map((plan) => (
                <PackageCard key={plan.id} plan={plan} features={defaultFeatures} featured />
              ))}
            </div>
          </div>
        )}

        {tourist.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Tourist Plans</h2>
              <p className="text-muted-foreground">Short-term coverage for visitors</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tourist.map((plan) => (
                <PackageCard key={plan.id} plan={plan} features={defaultFeatures.slice(0, 4)} />
              ))}
            </div>
          </div>
        )}

        <Card className="bg-accent/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <MessageCircle className="h-8 w-8 text-[#25D366] flex-shrink-0" />
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-semibold">Ready to subscribe?</h3>
                <p className="text-sm text-muted-foreground">
                  Contact us on WhatsApp to complete your payment and activate your subscription
                </p>
              </div>
              <a
                href="https://wa.me/264813370707?text=I%20want%20to%20subscribe%20to%20Ngumu's%20Eye"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-[#25D366] hover:bg-[#1fb855] text-white">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact on WhatsApp
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              <CardTitle>Have a Voucher Code?</CardTitle>
            </div>
            <CardDescription>
              Redeem your subscription voucher code here. Test voucher: IND-0000-ABCDERF
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRedeem} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="voucher">Voucher Code</Label>
                <Input
                  id="voucher"
                  placeholder="IND-0000-ABCDERF"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  className="font-mono"
                />
              </div>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

              <Button type="submit" className="w-full" disabled={!voucherCode || isRedeeming}>
                {isRedeeming ? "Redeeming..." : "Redeem Voucher"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function PackageCard({ plan, features, featured }: { plan: Plan; features: string[]; featured?: boolean }) {
  const price = plan.price_cents / 100
  const packageName = encodeURIComponent(plan.label)
  const whatsappMessage = `Hi, I want to subscribe to the ${plan.label} plan (N$${price} for ${plan.period_days} days)`
  const whatsappUrl = `https://wa.me/264813370707?text=${encodeURIComponent(whatsappMessage)}`

  return (
    <Card className={featured ? "border-primary shadow-lg relative" : "relative"}>
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}
      <CardHeader>
        <div>
          <CardTitle className="text-lg">{plan.label}</CardTitle>
          {plan.description && <CardDescription className="text-xs mt-1">{plan.description}</CardDescription>}
        </div>
        <div className="pt-4">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">N${price}</span>
            <span className="text-muted-foreground text-sm">/ {plan.period_days}d</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm">
          {features.slice(0, 6).map((feature: string, i: number) => (
            <li key={i} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Button className="w-full bg-primary hover:bg-primary/90" size="lg">
            Pay Now
          </Button>
        </a>
      </CardContent>
    </Card>
  )
}
