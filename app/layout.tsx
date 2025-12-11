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
  title: "NGUMU'S EYE — Social Welfare & Community App",
  description:
    "A modern, community-driven social welfare & neighborhood safety app. Stay informed. Stay safe. Stay connected with your community.",
  generator: "v0.app",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
  // OpenGraph for Facebook, WhatsApp, LinkedIn
  openGraph: {
    type: "website",
    url: "https://ngumu.vercel.app/",
    title: "NGUMU'S EYE — Social Welfare & Community App",
    description: "Stay informed. Stay safe. Stay connected with your community.",
    siteName: "Ngumu's Eye",
    images: [
      {
        url: "https://ngumu.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Ngumu's Eye - Social Welfare & Community App",
      },
    ],
  },
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "NGUMU'S EYE — Community Safety App",
    description: "Your trusted app for social welfare, alerts and community safety.",
    images: ["https://ngumu.vercel.app/og-image.png"],
  },
  // Additional SEO
  keywords: [
    "community safety",
    "social welfare",
    "neighborhood watch",
    "incident reporting",
    "community app",
    "Namibia",
  ],
  authors: [{ name: "Ngumu's Eye" }],
  creator: "Ngumu's Eye",
  publisher: "Ngumu's Eye",
  metadataBase: new URL("https://ngumu.vercel.app"),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Ngumu's Eye",
              url: "https://ngumu.vercel.app",
              logo: "https://ngumu.vercel.app/og-image.png",
              description: "A modern, community-driven social welfare & neighborhood safety app.",
              sameAs: [],
            }),
          }}
        />
      </head>
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
