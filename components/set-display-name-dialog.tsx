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

interface SetDisplayNameDialogProps {
  currentDisplayName: string
  userId: string
}

export function SetDisplayNameDialog({ currentDisplayName, userId }: SetDisplayNameDialogProps) {
  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState(currentDisplayName)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async () => {
    setIsLoading(true)
    await updateDisplayName(userId, displayName)
    setIsLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {currentDisplayName ? "Edit Display Name" : "Set Display Name"}
        </Button>
      </DialogTrigger>
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
          </div>
          <Button onClick={handleSubmit} disabled={isLoading || !displayName.trim()} className="w-full">
            {isLoading ? "Saving..." : "Save Display Name"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
