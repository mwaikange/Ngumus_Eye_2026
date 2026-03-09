import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { NProgressBar } from "@/components/nprogress-bar"
import { ToastProvider } from "@/components/toast-provider"
import Script from "next/script"
import { Suspense } from "react"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

const siteUrl = "https://app.ngumus-eye.site"

export const metadata: Metadata = {
  title: "NGUMU'S EYE — Social Welfare & Community App",
  description:
    "A modern, community-driven social welfare & neighborhood safety app. Stay informed. Stay safe. Stay connected with your community.",
  generator: "v0.app",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
  openGraph: {
    type: "website",
    url: `${siteUrl}/`,
    title: "NGUMU'S EYE — Social Welfare & Community App",
    description: "Stay informed. Stay safe. Stay connected with your community.",
    siteName: "NGUMU'S EYE",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "NGUMU'S EYE Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NGUMU'S EYE — Social Welfare & Community App",
    description: "Stay informed. Stay safe. Stay connected with your community.",
    images: [`${siteUrl}/og-image.png`],
  },
  // Additional SEO
  keywords: [
    "community safety",
    "social welfare",
    "neighborhood watch",
    "incident reporting",
    "community app",
    "Namibia",
    "ngumu",
    "safety alerts",
  ],
  authors: [{ name: "NGUMU'S EYE" }],
  creator: "NGUMU'S EYE",
  publisher: "NGUMU'S EYE",
  metadataBase: new URL(siteUrl),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <Script
          id="org-schema"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "NGUMU'S EYE",
              url: siteUrl,
              logo: `${siteUrl}/og-image.png`,
              description: "A modern, community-driven social welfare & neighborhood safety app.",
              sameAs: [],
            }),
          }}
        />
        <Suspense fallback={null}>
          <NProgressBar />
        </Suspense>
        <ToastProvider>{children}</ToastProvider>
        <Analytics />
      </body>
    </html>
  )
}
