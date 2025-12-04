"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateDisplayName } from "@/lib/actions/profile"
import { useRouter } from "next/navigation"
import { Loader2, Pencil } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SetDisplayNameDialogProps {
  currentDisplayName: string
  userId: string
}

export function SetDisplayNameDialog({ currentDisplayName, userId }: SetDisplayNameDialogProps) {
  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState(currentDisplayName)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      toast({
        title: "Error",
        description: "Display name cannot be empty",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    const result = await updateDisplayName(displayName.trim())
    setIsLoading(false)

    if (result?.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Display name updated successfully",
      })
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full bg-transparent gap-2">
          <Pencil className="h-3.5 w-3.5" />
          {currentDisplayName ? "Edit Display Name" : "Set Display Name"}
        </Button>
      </DialogTrigger>
      {/* </CHANGE> */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Display Name</DialogTitle>
          <DialogDescription>
            Your display name will be used for incident reports, groups, comments, and case desk submissions
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">{displayName.length}/50 characters</p>
          </div>
          <Button onClick={handleSubmit} disabled={isLoading || !displayName.trim()} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Display Name"
            )}
          </Button>
          {/* </CHANGE> */}
        </div>
      </DialogContent>
    </Dialog>
  )
}
