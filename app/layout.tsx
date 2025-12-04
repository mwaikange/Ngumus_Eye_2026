import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { NProgressBar } from "@/components/nprogress-bar"
import { ToastProvider } from "@/components/toast-provider"
import { Suspense } from "react"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Ngumu's Eye - Community Safety Platform",
  description: "Surveillance and community policing services for safer communities",
  generator: "v0.app",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <Suspense fallback={null}>
          <NProgressBar />
        </Suspense>
        <ToastProvider>{children}</ToastProvider>
        <Analytics />
      </body>
    </html>
  )
}
