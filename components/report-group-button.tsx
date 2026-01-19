"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Flag } from "lucide-react"
import { reportGroup } from "@/lib/actions/groups"
import { useToast } from "@/hooks/use-toast"

interface ReportGroupButtonProps {
  groupId: string
  hasReported: boolean
}

export function ReportGroupButton({ groupId, hasReported }: ReportGroupButtonProps) {
  const [reported, setReported] = useState(hasReported)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleReport = async () => {
    if (reported) return

    setIsLoading(true)
    try {
      const result = await reportGroup(groupId)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        setReported(true)
        toast({
          title: "Reported",
          description: "Your report has been submitted",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit report",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleReport}
      disabled={reported || isLoading}
      className={`h-7 px-2 text-xs ${reported ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
    >
      <Flag className={`h-3.5 w-3.5 mr-1 ${reported ? "fill-red-500" : ""}`} />
      {reported ? "Reported" : "Report"}
    </Button>
  )
}
