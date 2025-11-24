import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, Eye, MessageSquare } from "lucide-react"
import type { IncidentWithType } from "@/lib/types/database"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

interface IncidentCardProps {
  incident: IncidentWithType & {
    _count?: {
      comments: number
      reactions: number
    }
  }
}

const severityColors = {
  1: "bg-muted text-muted-foreground",
  2: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  3: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  4: "bg-red-500/10 text-red-700 dark:text-red-400",
  5: "bg-destructive/10 text-destructive",
}

const verificationLabels = ["Unverified", "Witness", "Moderator", "Partner"]

export function IncidentCard({ incident }: IncidentCardProps) {
  const severityColor =
    severityColors[incident.incident_types.severity as keyof typeof severityColors] || severityColors[1]

  return (
    <Link href={`/incident/${incident.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={severityColor}>{incident.incident_types.label}</Badge>
                {incident.verification_level > 0 && (
                  <Badge variant="outline" className="text-xs">
                    ✓ {verificationLabels[incident.verification_level]}
                  </Badge>
                )}
              </div>

              <h3 className="font-semibold leading-tight text-balance">{incident.title}</h3>

              {incident.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{incident.description}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{incident.area_radius_m}m radius</span>
                </div>
                {incident._count && (
                  <>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{incident._count.reactions}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{incident._count.comments}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
