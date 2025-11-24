import { Card, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"

export default function AuditPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground">View system activity and changes</p>
      </div>

      <Card>
        <CardContent className="pt-6 text-center space-y-2">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Audit logging coming soon</p>
          <p className="text-sm text-muted-foreground">Track all sensitive operations and data changes</p>
        </CardContent>
      </Card>
    </div>
  )
}
