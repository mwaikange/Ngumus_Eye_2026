import type React from "react"
import { SubscriptionGate } from "@/components/subscription-gate"

export default function CaseDeckLayout({ children }: { children: React.ReactNode }) {
  return <SubscriptionGate>{children}</SubscriptionGate>
}
