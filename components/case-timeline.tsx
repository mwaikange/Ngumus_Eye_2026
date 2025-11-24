import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, User } from "lucide-react"

export function CaseTimeline({ caseId, updates }: { caseId: string; updates: any[] }) {
  if (updates.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No updates yet</p>
          <p className="text-xs mt-1">Your investigator will post updates here</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {updates.map((update, index) => (
        <Card key={update.id}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                {index < updates.length - 1 && <div className="w-0.5 h-full bg-border mt-2" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-medium text-sm">{update.profiles?.display_name || "Investigator"}</p>
                  <Badge variant="outline" className="text-xs">
                    {update.is_public ? "Public" : "Internal"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{update.update_text}</p>
                {update.media_urls && update.media_urls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {update.media_urls.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary">
                        Attachment {i + 1}
                      </a>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(update.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
