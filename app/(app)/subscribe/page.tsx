"use client"

import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Check, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

const WHATSAPP_NUMBER = "264816802064"
const WHATSAPP_URL = `https://api.whatsapp.com/send/?phone=${WHATSAPP_NUMBER}&text&type=phone_number&app_absent=0`

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

const INDIVIDUAL_PLANS = [
  {
    id: 1,
    code: "individual_monthly",
    label: "Individual 1 Month",
    period_days: 30,
    price_cents: 7000, // N$70
    package_type: "individual",
    description: "Perfect for personal safety",
    features: ["Incident reporting", "Community groups", "File management", "24/7 support"],
  },
  {
    id: 2,
    code: "individual_3months",
    label: "Individual 3 Months",
    period_days: 90,
    price_cents: 18000, // N$180
    package_type: "individual",
    description: "Save with quarterly plan",
    features: ["Incident reporting", "Community groups", "File management", "24/7 support", "Priority response"],
  },
  {
    id: 3,
    code: "individual_6months",
    label: "Individual 6 Months",
    period_days: 180,
    price_cents: 36000, // N$360
    package_type: "individual",
    description: "Save with semi-annual plan",
    features: [
      "Incident reporting",
      "Community groups",
      "File management",
      "24/7 support",
      "Priority response",
      "Free counseling session",
    ],
  },
  {
    id: 4,
    code: "individual_12months",
    label: "Individual 12 Months",
    period_days: 365,
    price_cents: 66000, // N$660
    package_type: "individual",
    description: "Best value - annual plan",
    features: [
      "Incident reporting",
      "Community groups",
      "File management",
      "24/7 support",
      "Priority response",
      "Free counseling sessions",
    ],
  },
]

const FAMILY_PLANS = [
  {
    id: 5,
    code: "family_monthly",
    label: "Family 1 Month",
    period_days: 30,
    price_cents: 15000, // N$150
    package_type: "family",
    description: "Covers 4 Family Members",
    features: ["All individual features", "File management", "4 family members covered", "Priority response"],
  },
  {
    id: 6,
    code: "family_3months",
    label: "Family 3 Months",
    period_days: 90,
    price_cents: 36000, // N$360
    package_type: "family",
    description: "Covers 4 Family Members",
    features: ["All individual features", "File management", "4 family members covered", "Priority response"],
  },
  {
    id: 7,
    code: "family_6months",
    label: "Family 6 Months",
    period_days: 180,
    price_cents: 72000, // N$720
    package_type: "family",
    description: "Covers 4 Family Members",
    features: [
      "All individual features",
      "File management",
      "4 family members covered",
      "Priority response",
      "Free counseling",
    ],
  },
  {
    id: 8,
    code: "family_12months",
    label: "Family 12 Months",
    period_days: 365,
    price_cents: 144000, // N$1440
    package_type: "family",
    description: "Covers 6 Family Members",
    features: [
      "All individual features",
      "File management",
      "6 family members covered",
      "Priority response",
      "Free counseling sessions",
    ],
  },
]

const TOURIST_PLANS = [
  {
    id: 9,
    code: "tourist_5days",
    label: "Tourist 5 Days",
    period_days: 5,
    price_cents: 39900, // N$399
    package_type: "tourist",
    description: "Short stay coverage",
    features: ["Incident reporting", "Community groups", "File management", "24/7 support"],
  },
  {
    id: 10,
    code: "tourist_10days",
    label: "Tourist 10 Days",
    period_days: 10,
    price_cents: 70000, // N$700
    package_type: "tourist",
    description: "Extended stay coverage",
    features: ["Incident reporting", "Community groups", "File management", "24/7 support", "Priority response"],
  },
  {
    id: 11,
    code: "tourist_14days",
    label: "Tourist 14 Days",
    period_days: 14,
    price_cents: 90000, // N$900
    package_type: "tourist",
    description: "Two week coverage",
    features: ["Incident reporting", "Community groups", "File management", "24/7 support", "Priority response"],
  },
  {
    id: 12,
    code: "tourist_30days",
    label: "Tourist 30 Days",
    period_days: 30,
    price_cents: 180000, // N$1800
    package_type: "tourist",
    description: "Full month coverage",
    features: [
      "Incident reporting",
      "Community groups",
      "File management",
      "24/7 support",
      "Priority response",
      "Free counseling",
    ],
  },
]

export default function SubscribePage() {
  const [subscription, setSubscription] = useState<any>(null)
  const [voucherCode, setVoucherCode] = useState("")
  const [isRedeemingVoucher, setIsRedeemingVoucher] = useState(false)
  const [voucherError, setVoucherError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const supabase = createClient()

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

  async function handleRedeemVoucher() {
    if (!voucherCode.trim()) {
      setVoucherError("Please enter a voucher code")
      return
    }

    setIsRedeemingVoucher(true)
    setVoucherError(null)

    try {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setVoucherError("Please log in to redeem a voucher")
        setIsRedeemingVoucher(false)
        return
      }

      // Check if voucher exists and is unused
      const { data: voucher, error: voucherCheckError } = await supabase
        .from("vouchers")
        .select("*, plans(*)")
        .eq("code", voucherCode.trim().toUpperCase())
        .is("redeemed_by", null)
        .maybeSingle()

      console.log("[v0] Voucher check result:", { voucher, voucherCheckError })

      if (voucherCheckError) {
        console.error("[v0] Voucher check error:", voucherCheckError)
        setVoucherError("Error checking voucher code")
        setIsRedeemingVoucher(false)
        return
      }

      if (!voucher) {
        setVoucherError("Invalid or already used voucher code")
        setIsRedeemingVoucher(false)
        return
      }

      // Create subscription
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + (voucher.days || voucher.plans?.period_days || 30))

      const { error: subError } = await supabase.from("user_subscriptions").insert({
        user_id: user.id,
        plan_id: voucher.plan_id,
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        status: "active",
        payment_reference: `VOUCHER-${voucherCode}`,
      })

      if (subError) {
        console.error("[v0] Subscription creation error:", subError)
        setVoucherError("Failed to activate subscription")
        setIsRedeemingVoucher(false)
        return
      }

      // Mark voucher as redeemed
      await supabase
        .from("vouchers")
        .update({
          redeemed_by: user.id,
          redeemed_at: new Date().toISOString(),
        })
        .eq("code", voucherCode.trim().toUpperCase())

      toast({
        title: "Voucher redeemed!",
        description: `Your ${voucher.plans?.label} subscription is now active`,
      })

      setVoucherCode("")
      fetchData() // Refresh subscription data
    } catch (error) {
      setVoucherError("An error occurred. Please try again.")
    } finally {
      setIsRedeemingVoucher(false)
    }
  }

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

        {!subscription && (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Have a Voucher Code?</CardTitle>
              <CardDescription>Enter your subscription voucher code to activate your membership</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Enter voucher code"
                    value={voucherCode}
                    onChange={(e) => {
                      setVoucherCode(e.target.value.toUpperCase())
                      setVoucherError(null)
                    }}
                    disabled={isRedeemingVoucher}
                    className="uppercase"
                  />
                  {voucherError && <p className="text-sm text-destructive mt-1">{voucherError}</p>}
                </div>
                <Button onClick={handleRedeemVoucher} disabled={isRedeemingVoucher || !voucherCode.trim()}>
                  {isRedeemingVoucher ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Redeeming...
                    </>
                  ) : (
                    "Redeem"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Individual Plans */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Individual Plans</h2>
            <p className="text-muted-foreground">Perfect for personal safety and security</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {INDIVIDUAL_PLANS.map((plan) => (
              <PackageCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>

        {/* Family Plans */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Family Plans</h2>
            <p className="text-muted-foreground">Protect your whole family together</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {FAMILY_PLANS.map((plan) => (
              <PackageCard key={plan.id} plan={plan} featured />
            ))}
          </div>
        </div>

        {/* Tourist Plans */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Tourist Plans</h2>
            <p className="text-muted-foreground">Short-term coverage for visitors</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {TOURIST_PLANS.map((plan) => (
              <PackageCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>

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
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <Button className="bg-[#25D366] hover:bg-[#1fb855] text-white">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact on WhatsApp
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function PackageCard({ plan, featured }: { plan: (typeof INDIVIDUAL_PLANS)[0]; featured?: boolean }) {
  const price = plan.price_cents / 100
  const whatsappMessage = `Hi Ngumu's Eye Support, I would like to subscribe to the ${plan.label} of N$${price}. Please advise how I can make payment?`
  const whatsappUrl = `https://wa.me/264816802064?text=${encodeURIComponent(whatsappMessage)}`

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
          {plan.features?.slice(0, 6).map((feature: string, i: number) => (
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
