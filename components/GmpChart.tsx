'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { formatDateIST } from '@/lib/utils'
import { GmpDisclaimer } from './GmpDisclaimer'

interface GmpPoint {
  scrapedAt: string | Date
  gmpAmount: number
  gmpPercent: number
  kostak?: number | null
}

interface GmpChartProps {
  gmpHistory: GmpPoint[]
}

export function GmpChart({ gmpHistory }: GmpChartProps) {
  if (!gmpHistory || gmpHistory.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No GMP data available yet
        <GmpDisclaimer />
      </div>
    )
  }

  const data = gmpHistory.map((g) => ({
    date: formatDateIST(g.scrapedAt, 'dd MMM'),
    fullDate: formatDateIST(g.scrapedAt, 'dd MMM HH:mm'),
    gmpPercent: Math.round(g.gmpPercent * 10) / 10,
    gmpAmount: g.gmpAmount,
    kostak: g.kostak,
  }))

  const CustomTooltip = ({ active, payload }: Record<string, unknown>) => {
    if (!active || !Array.isArray(payload) || !payload.length) return null
    const d = payload[0].payload as typeof data[0]
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
        <p className="text-slate-400 mb-2">{d.fullDate}</p>
        <p className="text-emerald-400 font-bold">
          GMP: {d.gmpAmount >= 0 ? '+' : ''}₹{d.gmpAmount} ({d.gmpPercent >= 0 ? '+' : ''}{d.gmpPercent}%)
        </p>
        {d.kostak != null && (
          <p className="text-amber-400">Kostak: ₹{d.kostak}</p>
        )}
      </div>
    )
  }

  const minVal = Math.min(...data.map((d) => d.gmpPercent))
  const maxVal = Math.max(...data.map((d) => d.gmpPercent))
  const domain: [number, number] = [
    Math.min(minVal - 5, -5),
    Math.max(maxVal + 5, 5),
  ]

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={{ stroke: '#1e293b' }}
            tickLine={false}
          />
          <YAxis
            domain={domain}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <RechartsTooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 2" />
          <Line
            type="monotone"
            dataKey="gmpPercent"
            stroke="#34d399"
            strokeWidth={2}
            dot={{ fill: '#34d399', r: 3, strokeWidth: 0 }}
            activeDot={{ fill: '#10b981', r: 5, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <GmpDisclaimer />
    </div>
  )
}
