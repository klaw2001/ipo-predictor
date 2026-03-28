import { cn, LABEL_DISPLAY, LABEL_COLOR, type PredictionLabel, formatDateIST } from '@/lib/utils'

interface Prediction {
  score: number
  label: string
  confidence: number
  gmpSignal?: number | null
  subscriptionSignal?: number | null
  marketSignal?: number | null
  fundamentalSignal?: number | null
  sectorSignal?: number | null
  predictedAt: string | Date
  modelVersion: string
  disclaimer: string
}

interface PredictionSignalsProps {
  prediction: Prediction
}

const SIGNAL_BAR_COLOR: Record<string, string> = {
  STRONG_POSITIVE: 'bg-emerald-500',
  POSITIVE: 'bg-emerald-400',
  NEUTRAL: 'bg-amber-500',
  CAUTIOUS: 'bg-orange-500',
  STRONG_CAUTION: 'bg-red-500',
}

function SignalBar({ label, value, colorClass }: { label: string; value: number | null; colorClass: string }) {
  const pct = value ?? 50
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorClass)}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="text-xs text-slate-300 w-10 text-right font-mono">
        {value != null ? `${Math.round(value)}` : '—'}
      </span>
    </div>
  )
}

export function PredictionSignals({ prediction }: PredictionSignalsProps) {
  const label = prediction.label as PredictionLabel
  const displayLabel = LABEL_DISPLAY[label] || prediction.label
  const labelColor = LABEL_COLOR[label] || 'text-slate-400'
  const barColor = SIGNAL_BAR_COLOR[label] || 'bg-slate-500'
  const isLowConfidence = prediction.confidence < 0.5

  return (
    <div className="space-y-4">
      {/* Score header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-4xl font-extrabold', labelColor)}>
              {Math.round(prediction.score)}
            </span>
            <span className="text-slate-500 text-sm">/100</span>
          </div>
          <p className={cn('text-lg font-semibold mt-0.5', labelColor)}>{displayLabel}</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>Updated {formatDateIST(prediction.predictedAt, 'dd MMM, HH:mm')}</p>
          <p>Model v{prediction.modelVersion}</p>
          <p>Confidence: {(prediction.confidence * 100).toFixed(0)}%</p>
        </div>
      </div>

      {isLowConfidence && (
        <div className="text-xs text-slate-400 bg-slate-800/50 border border-slate-700 rounded-md px-3 py-2">
          ℹ Pre-subscription prediction — confidence will improve as IPO subscription data comes in.
        </div>
      )}

      {/* Signal bars */}
      <div className="space-y-2.5">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Signal Breakdown</p>
        <SignalBar label="GMP Signal" value={prediction.gmpSignal ?? null} colorClass={barColor} />
        <SignalBar label="Subscription" value={prediction.subscriptionSignal ?? null} colorClass={barColor} />
        <SignalBar label="Market Trend" value={prediction.marketSignal ?? null} colorClass={barColor} />
        <SignalBar label="Fundamentals" value={prediction.fundamentalSignal ?? null} colorClass={barColor} />
        <SignalBar label="Sector Trend" value={prediction.sectorSignal ?? null} colorClass={barColor} />
      </div>

      {/* SEBI Disclaimer — always shown, cannot be hidden */}
      <div className="border border-amber-500/30 bg-amber-500/5 rounded-md px-3 py-2.5 text-xs text-amber-200/70 leading-relaxed">
        <span className="font-semibold text-amber-400">Disclaimer: </span>
        {prediction.disclaimer}
      </div>
    </div>
  )
}
