"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
  const [open, setOpen] = useState(false)
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
      setOpen(false)
    }
  }

  if (reported) {
    return (
      <span className="flex items-center gap-1 text-xs text-red-500">
        <Flag className="h-3.5 w-3.5 fill-red-500" />
        Reported
      </span>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-red-500"
        >
          <Flag className="h-3.5 w-3.5 mr-1" />
          Report
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Report this group?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to report this group? This action cannot be undone and will be reviewed by moderators.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReport}
            disabled={isLoading}
            className="bg-red-500 hover:bg-red-600"
          >
            {isLoading ? "Reporting..." : "Report Group"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
