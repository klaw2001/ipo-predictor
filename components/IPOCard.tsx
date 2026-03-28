import Link from 'next/link'
import { cn, formatDateIST, formatCrores, STATUS_COLOR, type PredictionLabel } from '@/lib/utils'
import { ScoreBadge } from './ScoreBadge'
import { Badge } from '@/components/ui/badge'

interface IPOCardProps {
  ipo: {
    id: string
    slug: string
    name: string
    status: string
    category: string
    sector: string
    priceBandLow?: number | null
    priceBandHigh?: number | null
    issueSize?: number | null
    lotSize?: number | null
    openDate?: string | Date | null
    closeDate?: string | Date | null
    listingDate?: string | Date | null
    predictions?: Array<{ score: number; label: string; confidence: number }>
    gmpHistory?: Array<{ gmpPercent: number; gmpAmount: number }>
    subscriptions?: Array<{ totalTimes?: number | null }>
    result?: { listingGain: number } | null
  }
}

export function IPOCard({ ipo }: IPOCardProps) {
  const latestPrediction = ipo.predictions?.[0]
  const latestGmp = ipo.gmpHistory?.[0]
  const latestSub = ipo.subscriptions?.[0]
  const label = latestPrediction ? (latestPrediction.label as PredictionLabel) : undefined

  return (
    <Link href={`/ipo/${ipo.slug}`} className="block group">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 hover:bg-slate-900/80 transition-all duration-150">
        <div className="flex items-start justify-between gap-3">
          {/* Left: IPO info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-slate-100 font-semibold text-sm leading-tight truncate">
                {ipo.name}
              </h3>
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0',
                  STATUS_COLOR[ipo.status] || 'bg-slate-700 text-slate-400 border-slate-600'
                )}
              >
                {ipo.status}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              <Badge variant="outline" className="text-[10px] py-0 border-slate-700 text-slate-400">
                {ipo.category}
              </Badge>
              <Badge variant="outline" className="text-[10px] py-0 border-slate-700 text-slate-400">
                {ipo.sector}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {/* Price band */}
              {ipo.priceBandHigh && (
                <div>
                  <span className="text-slate-500">Price</span>{' '}
                  <span className="text-slate-300 font-mono">
                    ₹{ipo.priceBandLow !== ipo.priceBandHigh && ipo.priceBandLow
                      ? `${ipo.priceBandLow}–${ipo.priceBandHigh}`
                      : ipo.priceBandHigh}
                  </span>
                </div>
              )}

              {/* Lot size */}
              {ipo.lotSize && (
                <div>
                  <span className="text-slate-500">Lot</span>{' '}
                  <span className="text-slate-300 font-mono">{ipo.lotSize}</span>
                </div>
              )}

              {/* Issue size */}
              {ipo.issueSize && (
                <div>
                  <span className="text-slate-500">Size</span>{' '}
                  <span className="text-slate-300">{formatCrores(ipo.issueSize)}</span>
                </div>
              )}

              {/* Subscription */}
              {latestSub?.totalTimes != null && (
                <div>
                  <span className="text-slate-500">Sub</span>{' '}
                  <span className="text-amber-400 font-mono font-medium">
                    {latestSub.totalTimes.toFixed(2)}x
                  </span>
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="mt-2 text-[11px] text-slate-500">
              {ipo.status === 'OPEN' && ipo.closeDate && (
                <span>Closes {formatDateIST(ipo.closeDate)}</span>
              )}
              {ipo.status === 'UPCOMING' && ipo.openDate && (
                <span>Opens {formatDateIST(ipo.openDate)}</span>
              )}
              {ipo.status === 'LISTED' && ipo.listingDate && (
                <span>Listed {formatDateIST(ipo.listingDate)}</span>
              )}
              {ipo.status === 'CLOSED' && ipo.listingDate && (
                <span>Listing {formatDateIST(ipo.listingDate)}</span>
              )}
            </div>

            {/* Actual result for listed IPOs */}
            {ipo.result && (
              <div className="mt-1.5 text-xs">
                <span className="text-slate-500">Listed at </span>
                <span
                  className={cn(
                    'font-mono font-semibold',
                    ipo.result.listingGain >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}
                >
                  {ipo.result.listingGain >= 0 ? '+' : ''}{ipo.result.listingGain.toFixed(2)}%
                </span>
              </div>
            )}

            {/* GMP pill */}
            {latestGmp && !ipo.result && (
              <div className="mt-1.5">
                <span className="text-[11px] text-slate-600">GMP </span>
                <span
                  className={cn(
                    'text-[11px] font-mono font-medium',
                    latestGmp.gmpPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}
                >
                  {latestGmp.gmpPercent >= 0 ? '+' : ''}₹{latestGmp.gmpAmount} ({latestGmp.gmpPercent.toFixed(1)}%)
                </span>
                <span className="text-[10px] text-slate-700 ml-1">unofficial</span>
              </div>
            )}
          </div>

          {/* Right: AI Score */}
          {latestPrediction && (
            <div className="shrink-0">
              <ScoreBadge
                score={latestPrediction.score}
                label={label}
                confidence={latestPrediction.confidence}
                size="md"
              />
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
