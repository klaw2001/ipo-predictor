import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatInTimeZone } from 'date-fns-tz'
import { differenceInDays } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const IST = 'Asia/Kolkata'

export function formatDateIST(date: Date | string | null, fmt = 'dd MMM yyyy'): string {
  if (!date) return '—'
  try {
    return formatInTimeZone(new Date(date), IST, fmt)
  } catch {
    return '—'
  }
}

export function formatCrores(value: number | null | undefined): string {
  if (value == null) return '—'
  if (value >= 10000) return `₹${(value / 10000).toFixed(2)}L Cr`
  if (value >= 1000) return `₹${(value / 1000).toFixed(2)}K Cr`
  return `₹${value.toFixed(2)} Cr`
}

export function formatNumber(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '—'
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals })
}

export function daysUntil(date: Date | string | null): number | null {
  if (!date) return null
  return differenceInDays(new Date(date), new Date())
}

export type PredictionLabel =
  | 'STRONG_POSITIVE'
  | 'POSITIVE'
  | 'NEUTRAL'
  | 'CAUTIOUS'
  | 'STRONG_CAUTION'

export const LABEL_DISPLAY: Record<PredictionLabel, string> = {
  STRONG_POSITIVE: 'Strong Positive',
  POSITIVE: 'Positive',
  NEUTRAL: 'Neutral',
  CAUTIOUS: 'Cautious',
  STRONG_CAUTION: 'Strong Caution',
}

export const LABEL_COLOR: Record<PredictionLabel, string> = {
  STRONG_POSITIVE: 'text-emerald-400',
  POSITIVE: 'text-emerald-300',
  NEUTRAL: 'text-amber-400',
  CAUTIOUS: 'text-orange-400',
  STRONG_CAUTION: 'text-red-400',
}

export const LABEL_BG: Record<PredictionLabel, string> = {
  STRONG_POSITIVE: 'bg-emerald-500/20 border-emerald-500/40',
  POSITIVE: 'bg-emerald-400/10 border-emerald-400/30',
  NEUTRAL: 'bg-amber-500/10 border-amber-500/30',
  CAUTIOUS: 'bg-orange-500/10 border-orange-500/30',
  STRONG_CAUTION: 'bg-red-500/10 border-red-500/30',
}

export const LABEL_BAR: Record<PredictionLabel, string> = {
  STRONG_POSITIVE: 'bg-emerald-500',
  POSITIVE: 'bg-emerald-400',
  NEUTRAL: 'bg-amber-500',
  CAUTIOUS: 'bg-orange-500',
  STRONG_CAUTION: 'bg-red-500',
}

export function scoreToLabel(score: number): PredictionLabel {
  if (score >= 75) return 'STRONG_POSITIVE'
  if (score >= 60) return 'POSITIVE'
  if (score >= 45) return 'NEUTRAL'
  if (score >= 30) return 'CAUTIOUS'
  return 'STRONG_CAUTION'
}

export const STATUS_COLOR: Record<string, string> = {
  OPEN: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  UPCOMING: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  CLOSED: 'bg-slate-600/20 text-slate-400 border-slate-600/40',
  LISTED: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
}
