"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useFormStatus } from "react-dom"

export function ActionButton({
  children,
  variant = "default",
  className = "",
  loadingText = "Loading...",
  ...props
}: {
  children: React.ReactNode
  variant?: "default" | "outline" | "ghost" | "destructive"
  className?: string
  loadingText?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant={variant} className={className} disabled={pending} {...props}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
