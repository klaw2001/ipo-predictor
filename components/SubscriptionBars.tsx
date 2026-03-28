'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface SubscriptionData {
  qibTimes?: number | null
  hniTimes?: number | null
  retailTimes?: number | null
  totalTimes?: number | null
  day?: number
  scrapedAt?: string | Date
}

interface SubscriptionBarsProps {
  subscriptions: SubscriptionData[]
}

const COLORS = {
  qib: '#60a5fa',    // blue-400
  hni: '#c084fc',    // purple-400
  retail: '#34d399', // emerald-400
  total: '#f59e0b',  // amber-500
}

export function SubscriptionBars({ subscriptions }: SubscriptionBarsProps) {
  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="text-center py-6 text-slate-500 text-sm">
        Subscription data not yet available
      </div>
    )
  }

  // Use latest record
  const latest = subscriptions[subscriptions.length - 1]

  const data = [
    { name: 'QIB', value: latest.qibTimes || 0, color: COLORS.qib },
    { name: 'HNI / NII', value: latest.hniTimes || 0, color: COLORS.hni },
    { name: 'Retail', value: latest.retailTimes || 0, color: COLORS.retail },
    { name: 'Total', value: latest.totalTimes || 0, color: COLORS.total },
  ]

  const CustomTooltip = ({ active, payload }: Record<string, unknown>) => {
    if (!active || !Array.isArray(payload) || !payload.length) return null
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
        <p className="text-slate-400">{payload[0].payload.name}</p>
        <p className="font-bold" style={{ color: payload[0].payload.color }}>
          {(payload[0].value as number).toFixed(2)}x subscribed
        </p>
      </div>
    )
  }

  return (
    <div>
      {latest.day && (
        <p className="text-xs text-slate-500 mb-2">Day {latest.day} subscription data</p>
      )}
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}x`} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Text summary */}
      <div className="grid grid-cols-4 gap-2 mt-2">
        {data.map((d) => (
          <div key={d.name} className="text-center">
            <p className="text-[10px] text-slate-500">{d.name}</p>
            <p className="text-sm font-bold" style={{ color: d.color }}>
              {d.value.toFixed(2)}x
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
