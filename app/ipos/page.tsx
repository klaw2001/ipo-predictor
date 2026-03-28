export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { IPOCard } from '@/components/IPOCard'
import { SectorFilter } from '@/components/SectorFilter'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'All IPOs — Upcoming, Open & Listed Indian IPOs',
  description: 'Browse all upcoming, open, closed and listed Indian IPOs with AI scores, GMP, and subscription data.',
}

const STATUS_OPTIONS = ['', 'OPEN', 'UPCOMING', 'CLOSED', 'LISTED']
const CATEGORY_OPTIONS = ['', 'MAINBOARD', 'SME']

interface SearchParams {
  status?: string
  category?: string
  sector?: string
  page?: string
}

export default async function AllIPOsPage({ searchParams }: { searchParams: SearchParams }) {
  const status = searchParams.status || ''
  const category = searchParams.category || ''
  const sector = searchParams.sector || ''
  const page = Math.max(1, parseInt(searchParams.page || '1'))
  const limit = 20

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (category) where.category = category
  if (sector) where.sector = sector

  const [ipos, total, sectors] = await Promise.all([
    prisma.iPO.findMany({
      where,
      include: {
        predictions: { orderBy: { predictedAt: 'desc' }, take: 1 },
        gmpHistory: { orderBy: { scrapedAt: 'desc' }, take: 1 },
        subscriptions: { orderBy: { scrapedAt: 'desc' }, take: 1 },
        result: true,
      },
      orderBy: [{ openDate: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.iPO.count({ where }),
    prisma.iPO.findMany({ select: { sector: true }, distinct: ['sector'] }),
  ])

  const totalPages = Math.ceil(total / limit)
  const uniqueSectors = sectors.map((s) => s.sector).filter(Boolean).sort()

  const buildUrl = (overrides: Record<string, string>) => {
    const params = new URLSearchParams()
    const base = { status, category, sector, page: '1', ...overrides }
    Object.entries(base).forEach(([k, v]) => { if (v) params.set(k, v) })
    return `/ipos?${params.toString()}`
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-100 mb-1">All Indian IPOs</h1>
        <p className="text-slate-500 text-sm">{total} IPOs found</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Status filter */}
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((s) => (
            <Link
              key={s || 'all'}
              href={buildUrl({ status: s })}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                status === s
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {s || 'All'}
            </Link>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex gap-1">
          {CATEGORY_OPTIONS.map((c) => (
            <Link
              key={c || 'all-cat'}
              href={buildUrl({ category: c })}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                category === c
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {c || 'Main+SME'}
            </Link>
          ))}
        </div>

        {/* Sector filter */}
        {uniqueSectors.length > 0 && (
          <SectorFilter
            sectors={uniqueSectors}
            selected={sector}
            status={status}
            category={category}
          />
        )}
      </div>

      {/* IPO grid */}
      {ipos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {ipos.map((ipo) => (
            <IPOCard key={ipo.id} ipo={ipo} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-slate-600">
          <p className="text-lg">No IPOs found for the selected filters</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={buildUrl({ page: String(page - 1) })}
              className="px-4 py-2 text-sm border border-slate-700 text-slate-400 rounded-md hover:border-slate-600 hover:text-slate-300 transition-colors"
            >
              ← Prev
            </Link>
          )}
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={buildUrl({ page: String(page + 1) })}
              className="px-4 py-2 text-sm border border-slate-700 text-slate-400 rounded-md hover:border-slate-600 hover:text-slate-300 transition-colors"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
