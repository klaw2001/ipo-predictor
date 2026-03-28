import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { MarketTicker } from '@/components/MarketTicker'
import { TooltipProvider } from '@/components/ui/tooltip'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: {
    default: 'IPOPredictor — AI-Powered IPO Intelligence for Indian Markets',
    template: '%s | IPOPredictor',
  },
  description:
    'Track all upcoming, live and past Indian IPOs with AI-predicted listing success scores. Live GMP, subscription data, and prediction signals for NSE/BSE IPOs.',
  keywords: [
    'IPO GMP today',
    'IPO subscription status',
    'IPO listing prediction',
    'Indian IPO 2025',
    'NSE IPO',
    'BSE IPO',
    'upcoming IPO',
    'IPO allotment',
  ],
  openGraph: {
    title: 'IPOPredictor — AI-Powered IPO Intelligence',
    description: 'Live GMP, subscription data, and AI predictions for all Indian IPOs.',
    type: 'website',
    url: 'https://ipopredictor.in',
  },
  metadataBase: new URL('https://ipopredictor.in'),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-slate-950 text-slate-200 antialiased min-h-screen flex flex-col">
        <TooltipProvider>
          <Navbar />
          <MarketTicker />
          <main className="flex-1">{children}</main>
          <Footer />
        </TooltipProvider>
      </body>
    </html>
  )
}
