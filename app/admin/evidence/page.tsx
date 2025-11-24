import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import { ImageIcon } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default async function EvidencePage() {
  const supabase = await createClient()

  const { data: media } = await supabase
    .from("incident_media")
    .select(`
      *,
      incidents(title, incident_types(label))
    `)
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Evidence Management</h1>
        <p className="text-muted-foreground">Review and manage incident media</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Evidence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {media && media.length > 0 ? (
              media.map((item: any) => (
                <Card key={item.id}>
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <CardContent className="p-3 space-y-2">
                    <Badge variant="outline">{item.incidents?.incident_types?.label || "Unknown"}</Badge>
                    <p className="text-sm font-medium line-clamp-1">{item.incidents?.title || "Untitled"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">No evidence uploaded yet</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
