import { Card, CardContent } from "@/components/ui/card"
import { Building2 } from "lucide-react"

export default function PartnersPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Partner Management</h1>
        <p className="text-muted-foreground">Manage partner organizations and integrations</p>
      </div>

      <Card>
        <CardContent className="pt-6 text-center space-y-2">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Partner management coming soon</p>
          <p className="text-sm text-muted-foreground">Configure webhooks and API access for partner organizations</p>
        </CardContent>
      </Card>
    </div>
  )
}
