"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export function NProgressBar() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Start progress on route change
    setLoading(true)
    setProgress(10)

    const timer1 = setTimeout(() => setProgress(30), 100)
    const timer2 = setTimeout(() => setProgress(60), 200)
    const timer3 = setTimeout(() => setProgress(80), 400)
    const timer4 = setTimeout(() => {
      setProgress(100)
      setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 200)
    }, 500)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
    }
  }, [pathname])

  if (!loading && progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1">
      <div className="h-full bg-primary transition-all duration-200 ease-out" style={{ width: `${progress}%` }} />
      {loading && (
        <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-r from-transparent to-primary/50 animate-pulse" />
      )}
    </div>
  )
}
