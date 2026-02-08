import type { Metadata } from 'next'
import { Libre_Baskerville } from 'next/font/google'
import Script from 'next/script'

import { AuthProvider } from '@/components/auth/AuthProvider'
import './globals.css'

const libreBaskerville = Libre_Baskerville({
  variable: '--font-libre-baskerville',
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'reFrame\u2122 \u2014 Say it better.',
  description:
    'Transform emotionally charged messages into dignity-first communication. Break generational cycles. Model what you want to pass on.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-R3PQF5P29J"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-R3PQF5P29J');
          `}
        </Script>
      </head>
      <body className={`${libreBaskerville.variable} font-serif antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
