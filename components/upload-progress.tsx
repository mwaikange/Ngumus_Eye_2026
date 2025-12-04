"use client"

import { Progress } from "@/components/ui/progress"
import { Loader2, CheckCircle, XCircle, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

export type UploadStatus = "idle" | "preparing" | "compressing" | "uploading" | "success" | "error"

interface UploadProgressProps {
  status: UploadStatus
  progress: number
  fileName?: string
  error?: string
  className?: string
}

export function UploadProgress({ status, progress, fileName, error, className }: UploadProgressProps) {
  if (status === "idle") return null

  const getStatusText = () => {
    switch (status) {
      case "preparing":
        return "Preparing..."
      case "compressing":
        return "Compressing..."
      case "uploading":
        return `Uploading${progress > 0 ? ` ${progress}%` : "..."}`
      case "success":
        return "Complete!"
      case "error":
        return error || "Upload failed"
      default:
        return ""
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case "preparing":
      case "compressing":
      case "uploading":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />
      default:
        return <Upload className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className={cn("space-y-2 p-3 bg-muted/50 rounded-lg animate-fade-in", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {getStatusIcon()}
          <span className="text-sm font-medium truncate">{fileName || getStatusText()}</span>
        </div>
        {status === "uploading" && <span className="text-sm text-muted-foreground flex-shrink-0">{progress}%</span>}
      </div>

      {(status === "uploading" || status === "compressing" || status === "preparing") && (
        <Progress value={progress} className="h-1.5" />
      )}

      {status === "error" && error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
