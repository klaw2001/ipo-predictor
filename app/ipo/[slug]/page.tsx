import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { ScoreBadge } from '@/components/ScoreBadge'
import { GmpChart } from '@/components/GmpChart'
import { SubscriptionBars } from '@/components/SubscriptionBars'
import { PredictionSignals } from '@/components/PredictionSignals'
import { Badge } from '@/components/ui/badge'
import { cn, formatDateIST, formatCrores, STATUS_COLOR, type PredictionLabel } from '@/lib/utils'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ipo = await prisma.iPO.findUnique({ where: { slug: params.slug } })
  if (!ipo) return { title: 'IPO Not Found' }
  return {
    title: `${ipo.name} IPO — AI Prediction, GMP & Subscription`,
    description: `${ipo.name} IPO details: price band ₹${ipo.priceBandHigh}, subscription data, GMP, and AI listing prediction.`,
  }
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex justify-between py-2 border-b border-slate-800/60">
      <span className="text-slate-500 text-sm">{label}</span>
      <span className="text-slate-200 text-sm font-medium text-right">{value}</span>
    </div>
  )
}

export default async function IPODetailPage({ params }: Props) {
  const ipo = await prisma.iPO.findUnique({
    where: { slug: params.slug },
    include: {
      predictions: { orderBy: { predictedAt: 'desc' }, take: 10 },
      gmpHistory: { orderBy: { scrapedAt: 'asc' } },
      subscriptions: { orderBy: { scrapedAt: 'asc' } },
      result: true,
    },
  })

  if (!ipo) notFound()

  const latestPrediction = ipo.predictions[0]
  const label = latestPrediction?.label as PredictionLabel | undefined

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded border font-medium',
                STATUS_COLOR[ipo.status] || 'bg-slate-700 text-slate-400 border-slate-600'
              )}
            >
              {ipo.status}
            </span>
            <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
              {ipo.category}
            </Badge>
            <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
              {ipo.sector}
            </Badge>
          </div>

          <h1 className="text-3xl font-black text-slate-100 mb-1">{ipo.name}</h1>
          {ipo.issuerCompany !== ipo.name && (
            <p className="text-slate-500 text-sm">{ipo.issuerCompany}</p>
          )}

          {/* Key stats row */}
          <div className="flex flex-wrap gap-4 mt-3 text-sm">
            {ipo.priceBandHigh && (
              <div>
                <span className="text-slate-500">Price Band </span>
                <span className="text-slate-200 font-mono font-semibold">
                  ₹{ipo.priceBandLow && ipo.priceBandLow !== ipo.priceBandHigh
                    ? `${ipo.priceBandLow}–${ipo.priceBandHigh}`
                    : ipo.priceBandHigh}
                </span>
              </div>
            )}
            {ipo.lotSize && (
              <div>
                <span className="text-slate-500">Lot Size </span>
                <span className="text-slate-200 font-mono font-semibold">{ipo.lotSize}</span>
              </div>
            )}
            {ipo.issueSize && (
              <div>
                <span className="text-slate-500">Issue Size </span>
                <span className="text-slate-200 font-semibold">{formatCrores(ipo.issueSize)}</span>
              </div>
            )}
          </div>

          {/* Listed result */}
          {ipo.result && (
            <div className="mt-3 inline-flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
              <span className="text-slate-400 text-sm">Listed at</span>
              <span className="text-slate-100 font-mono font-semibold">₹{ipo.result.listingPrice}</span>
              <span
                className={cn(
                  'font-mono font-bold text-sm',
                  ipo.result.listingGain >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}
              >
                ({ipo.result.listingGain >= 0 ? '+' : ''}{ipo.result.listingGain.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>

        {/* AI Score */}
        {latestPrediction && (
          <div className="shrink-0">
            <ScoreBadge
              score={latestPrediction.score}
              label={label}
              confidence={latestPrediction.confidence}
              size="lg"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subscription data */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
              Subscription
            </h2>
            <SubscriptionBars subscriptions={ipo.subscriptions} />
          </div>

          {/* GMP Chart */}
          {ipo.gmpHistory.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
                GMP History
              </h2>
              <GmpChart gmpHistory={ipo.gmpHistory} />
            </div>
          )}

          {/* IPO Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
              IPO Details
            </h2>
            <div>
              <InfoRow label="Open Date" value={formatDateIST(ipo.openDate)} />
              <InfoRow label="Close Date" value={formatDateIST(ipo.closeDate)} />
              <InfoRow label="Allotment Date" value={formatDateIST(ipo.allotmentDate)} />
              <InfoRow label="Listing Date" value={formatDateIST(ipo.listingDate)} />
              <InfoRow label="Exchange" value={ipo.exchange} />
              <InfoRow label="Category" value={ipo.category} />
              <InfoRow label="Issue Size" value={formatCrores(ipo.issueSize)} />
              <InfoRow label="Fresh Issue" value={ipo.freshIssue ? formatCrores(ipo.freshIssue) : null} />
              <InfoRow label="OFS" value={ipo.ofs ? formatCrores(ipo.ofs) : null} />
              <InfoRow label="Min Investment" value={
                ipo.lotSize && ipo.priceBandHigh
                  ? `₹${(ipo.lotSize * ipo.priceBandHigh).toLocaleString('en-IN')}`
                  : null
              } />
              <InfoRow label="Registrar" value={ipo.registrar} />
              {ipo.leadManagers?.length > 0 && (
                <InfoRow label="Lead Manager(s)" value={ipo.leadManagers.join(', ')} />
              )}
            </div>
          </div>

          {/* Financials */}
          {(ipo.revenue || ipo.netProfit || ipo.peRatio || ipo.roe) && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
                Financials
              </h2>
              <div>
                <InfoRow label="Revenue" value={formatCrores(ipo.revenue)} />
                <InfoRow label="Net Profit" value={formatCrores(ipo.netProfit)} />
                <InfoRow label="P/E Ratio" value={ipo.peRatio?.toFixed(2)} />
                <InfoRow label="ROE" value={ipo.roe ? `${ipo.roe.toFixed(2)}%` : null} />
                <InfoRow label="ROCE" value={ipo.roce ? `${ipo.roce.toFixed(2)}%` : null} />
                <InfoRow label="Debt/Equity" value={ipo.debtToEquity?.toFixed(2)} />
                <InfoRow label="Promoter Holding" value={ipo.promoterHolding ? `${ipo.promoterHolding.toFixed(2)}%` : null} />
              </div>
            </div>
          )}
        </div>

        {/* Right column (1/3): AI Prediction */}
        <div className="space-y-6">
          {latestPrediction && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
                AI Prediction
              </h2>
              <PredictionSignals prediction={latestPrediction} />
            </div>
          )}

          {!latestPrediction && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center text-slate-500 text-sm py-8">
              <p>No AI prediction available yet.</p>
              <p className="text-xs mt-1">Predictions are generated after GMP and subscription data are available.</p>
            </div>
          )}

          {/* Prediction history */}
          {ipo.predictions.length > 1 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
                Score History
              </h2>
              <div className="space-y-2">
                {ipo.predictions.slice(0, 8).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{formatDateIST(p.predictedAt, 'dd MMM HH:mm')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            p.score >= 75 ? 'bg-emerald-500' :
                            p.score >= 60 ? 'bg-emerald-400' :
                            p.score >= 45 ? 'bg-amber-500' :
                            p.score >= 30 ? 'bg-orange-500' : 'bg-red-500'
                          )}
                          style={{ width: `${p.score}%` }}
                        />
                      </div>
                      <span className="text-slate-300 font-mono w-8 text-right">{Math.round(p.score)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {(ipo.drhpUrl || ipo.rhpUrl) && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Documents</h2>
              <div className="space-y-2">
                {ipo.drhpUrl && (
                  <a href={ipo.drhpUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300">
                    📄 Draft Red Herring Prospectus (DRHP)
                  </a>
                )}
                {ipo.rhpUrl && (
                  <a href={ipo.rhpUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300">
                    📄 Red Herring Prospectus (RHP)
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
