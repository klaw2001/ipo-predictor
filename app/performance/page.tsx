'use client'

import { useEffect, useState } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
interface PerformanceData {
  totalPredictions: number
  accuracy: number
  byLabel: Record<string, { accuracy: number; total: number }>
  bySector: Record<string, { accuracy: number; total: number }>
  recentAccuracy: { last10: number; last20: number; last50: number }
  scatterData: Array<{
    ipoName: string
    predictedScore: number
    predictedLabel: string
    actualGain: number
    sector: string
  }>
}

const LABEL_DISPLAY: Record<string, string> = {
  STRONG_POSITIVE: 'Strong Positive',
  POSITIVE: 'Positive',
  NEUTRAL: 'Neutral',
  CAUTIOUS: 'Cautious',
  STRONG_CAUTION: 'Strong Caution',
}

function AccuracyBar({ label, accuracy, total }: { label: string; accuracy: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-32 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${accuracy}%` }}
        />
      </div>
      <span className="text-xs text-slate-300 font-mono w-16 text-right">
        {accuracy.toFixed(1)}% <span className="text-slate-600">({total})</span>
      </span>
    </div>
  )
}

export default function PerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/performance')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center text-slate-500">
        Loading performance data...
      </div>
    )
  }

  if (!data || data.totalPredictions === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center text-slate-600">
        <p className="text-lg mb-2">No completed predictions yet</p>
        <p className="text-sm">Performance metrics will appear once IPOs have listed and results are recorded.</p>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: Record<string, unknown>) => {
    if (!active || !Array.isArray(payload) || !payload.length) return null
    const d = payload[0].payload as PerformanceData['scatterData'][0]
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
        <p className="text-slate-200 font-medium">{d.ipoName}</p>
        <p className="text-slate-400">{d.sector}</p>
        <p className="text-blue-400">AI Score: {d.predictedScore.toFixed(1)}</p>
        <p className={d.actualGain >= 0 ? 'text-emerald-400' : 'text-red-400'}>
          Actual: {d.actualGain >= 0 ? '+' : ''}{d.actualGain.toFixed(2)}%
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-100 mb-1">Model Performance</h1>
        <p className="text-slate-500 text-sm">
          How accurate are our AI predictions? Based on {data.totalPredictions} completed IPO predictions.
        </p>
      </div>

      {/* Overall accuracy */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-black text-blue-400">{data.accuracy.toFixed(1)}%</p>
          <p className="text-xs text-slate-500 mt-1">Overall Accuracy</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-black text-emerald-400">{data.recentAccuracy.last10.toFixed(1)}%</p>
          <p className="text-xs text-slate-500 mt-1">Last 10 IPOs</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-black text-amber-400">{data.recentAccuracy.last20.toFixed(1)}%</p>
          <p className="text-xs text-slate-500 mt-1">Last 20 IPOs</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-black text-slate-300">{data.totalPredictions}</p>
          <p className="text-xs text-slate-500 mt-1">Total Predicted</p>
        </div>
      </div>

      {/* Scatter chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-1 uppercase tracking-wider">
          Predicted Score vs Actual Listing Gain
        </h2>
        <p className="text-xs text-slate-600 mb-4">Each dot is one IPO. Top-right and bottom-left quadrants = correct predictions.</p>
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              type="number"
              dataKey="predictedScore"
              name="AI Score"
              domain={[0, 100]}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'AI Score', position: 'insideBottom', fill: '#475569', fontSize: 11, offset: -5 }}
            />
            <YAxis
              type="number"
              dataKey="actualGain"
              name="Actual Gain %"
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              label={{ value: 'Actual %', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 11 }}
            />
            <ReferenceLine x={50} stroke="#334155" strokeDasharray="4 2" />
            <ReferenceLine y={0} stroke="#334155" strokeDasharray="4 2" />
            <Tooltip content={<CustomTooltip />} />
            <Scatter
              data={data.scatterData}
              fill="#60a5fa"
              fillOpacity={0.7}
              r={5}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By label */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
            Accuracy by Prediction
          </h2>
          <div className="space-y-3">
            {Object.entries(data.byLabel).map(([label, stat]) => (
              <AccuracyBar
                key={label}
                label={LABEL_DISPLAY[label] || label}
                accuracy={stat.accuracy}
                total={stat.total}
              />
            ))}
          </div>
        </div>

        {/* By sector */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
            Accuracy by Sector
          </h2>
          <div className="space-y-3">
            {Object.entries(data.bySector)
              .sort(([, a], [, b]) => b.total - a.total)
              .slice(0, 8)
              .map(([sector, stat]) => (
                <AccuracyBar
                  key={sector}
                  label={sector}
                  accuracy={stat.accuracy}
                  total={stat.total}
                />
              ))}
          </div>
        </div>
      </div>

      <div className="mt-6 text-xs text-slate-600 leading-relaxed">
        Accuracy is measured as correct directional prediction (positive predicted = positive listing). Not financial advice.
      </div>
    </div>
  )
}
