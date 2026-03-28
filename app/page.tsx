export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { IPOCard } from '@/components/IPOCard'

async function getIPOs(status: string) {
  return prisma.iPO.findMany({
    where: { status },
    include: {
      predictions: { orderBy: { predictedAt: 'desc' }, take: 1 },
      gmpHistory: { orderBy: { scrapedAt: 'desc' }, take: 1 },
      subscriptions: { orderBy: { scrapedAt: 'desc' }, take: 1 },
      result: true,
    },
    orderBy: { openDate: 'desc' },
    take: 6,
  })
}

async function getStats() {
  const [total, withPredictions, results] = await Promise.all([
    prisma.iPO.count(),
    prisma.iPOPrediction.count(),
    prisma.iPOResult.findMany({ take: 50 }),
  ])

  let accuracy = 0
  if (results.length > 0) {
    const ipoIds = results.map((r) => r.ipoId)
    const predictions = await prisma.iPOPrediction.findMany({
      where: { ipoId: { in: ipoIds } },
      orderBy: { predictedAt: 'asc' },
      distinct: ['ipoId'],
    })

    const correct = predictions.filter((p) => {
      const result = results.find((r) => r.ipoId === p.ipoId)
      if (!result) return false
      return (p.score >= 50) === (result.listingGain >= 0)
    }).length

    accuracy = predictions.length > 0 ? (correct / predictions.length) * 100 : 0
  }

  return { total, withPredictions, accuracy }
}

export default async function HomePage() {
  const [openIPOs, upcomingIPOs, listedIPOs, stats] = await Promise.all([
    getIPOs('OPEN'),
    getIPOs('UPCOMING'),
    getIPOs('LISTED'),
    getStats(),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-xs text-emerald-400 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live tracking · Updated every few hours
        </div>

        <h1 className="text-4xl md:text-5xl font-black text-slate-100 leading-tight mb-4">
          Indian IPO Intelligence
          <span className="text-emerald-400 animate-blink">_</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
          AI-powered predictions, live GMP tracking, and real-time subscription data
          for all upcoming and open Indian IPOs.
        </p>

        {/* Stats bar */}
        <div className="flex justify-center gap-8 md:gap-16 flex-wrap">
          <div className="text-center">
            <p className="text-3xl font-black text-emerald-400">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-1">IPOs Tracked</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-amber-400">{stats.withPredictions}</p>
            <p className="text-xs text-slate-500 mt-1">Predictions Made</p>
          </div>
          {stats.accuracy > 0 && (
            <div className="text-center">
              <p className="text-3xl font-black text-blue-400">{stats.accuracy.toFixed(1)}%</p>
              <p className="text-xs text-slate-500 mt-1">Prediction Accuracy</p>
            </div>
          )}
        </div>
      </div>

      {/* Open IPOs */}
      {openIPOs.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Open Now
            </h2>
            <Link href="/ipos?status=OPEN" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {openIPOs.map((ipo) => (
              <IPOCard key={ipo.id} ipo={ipo} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming IPOs */}
      {upcomingIPOs.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Coming Soon
            </h2>
            <Link href="/ipos?status=UPCOMING" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingIPOs.map((ipo) => (
              <IPOCard key={ipo.id} ipo={ipo} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Listed */}
      {listedIPOs.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              Recently Listed
            </h2>
            <Link href="/ipos?status=LISTED" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listedIPOs.map((ipo) => (
              <IPOCard key={ipo.id} ipo={ipo} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {openIPOs.length === 0 && upcomingIPOs.length === 0 && listedIPOs.length === 0 && (
        <div className="text-center py-20 text-slate-600">
          <p className="text-4xl mb-4">📊</p>
          <p className="text-lg font-medium mb-2">No IPO data yet</p>
          <p className="text-sm">
            Trigger a scrape via{' '}
            <code className="text-slate-400 bg-slate-800 px-1 py-0.5 rounded text-xs">
              POST /api/admin/trigger-scrape
            </code>{' '}
            to populate the database.
          </p>
        </div>
      )}

      {/* SEBI Disclaimer */}
      <div className="mt-10 border border-amber-500/20 bg-amber-500/5 rounded-xl px-4 py-3 text-xs text-amber-200/60 leading-relaxed">
        <span className="font-semibold text-amber-400">Disclaimer: </span>
        IPOPredictor is an AI-based educational tool. AI scores are not investment advice. GMP data is unofficial and not regulated by SEBI.
        Please consult a SEBI-registered advisor before investing.
      </div>
    </div>
  )
}
