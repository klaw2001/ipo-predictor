'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface MarketData {
  nifty50: number
  nifty50Chg: number
  bankNifty: number
  bankNiftyChg: number
  vix: number
  marketStatus: string
}

function TickerItem({ label, value, change }: { label: string; value: number; change?: number }) {
  const isPositive = (change ?? 0) >= 0
  return (
    <span className="inline-flex items-center gap-2 px-4 shrink-0">
      <span className="text-slate-500 text-xs font-medium">{label}</span>
      <span className="text-slate-200 text-xs font-mono font-semibold">
        {value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </span>
      {change !== undefined && (
        <span className={cn('text-xs font-mono', isPositive ? 'text-emerald-400' : 'text-red-400')}>
          {isPositive ? '+' : ''}{change.toFixed(2)}%
        </span>
      )}
      <span className="text-slate-700">|</span>
    </span>
  )
}

export function MarketTicker() {
  const [market, setMarket] = useState<MarketData | null>(null)

  useEffect(() => {
    fetch('/api/market')
      .then((r) => r.json())
      .then((d) => setMarket(d.market))
      .catch(() => {})

    const interval = setInterval(() => {
      fetch('/api/market')
        .then((r) => r.json())
        .then((d) => setMarket(d.market))
        .catch(() => {})
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  if (!market) {
    return (
      <div className="bg-slate-900 border-b border-slate-800 py-1.5 px-4 text-xs text-slate-600">
        Loading market data...
      </div>
    )
  }

  const items = (
    <>
      <TickerItem label="NIFTY 50" value={market.nifty50} change={market.nifty50Chg} />
      <TickerItem label="BANK NIFTY" value={market.bankNifty} change={market.bankNiftyChg} />
      <TickerItem label="INDIA VIX" value={market.vix} />
      <span className={cn(
        'inline-flex items-center gap-1.5 px-4 shrink-0 text-xs font-medium',
        market.marketStatus === 'OPEN' ? 'text-emerald-400' : 'text-slate-500'
      )}>
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          market.marketStatus === 'OPEN' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
        )} />
        {market.marketStatus}
        <span className="text-slate-700">|</span>
      </span>
    </>
  )

  return (
    <div className="bg-slate-900/80 border-b border-slate-800 py-1.5 overflow-hidden">
      <div className="flex animate-ticker whitespace-nowrap">
        {items}
        {items}
      </div>
    </div>
  )
}
