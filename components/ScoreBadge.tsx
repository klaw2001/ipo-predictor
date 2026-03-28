'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  cn,
  LABEL_BG,
  LABEL_COLOR,
  LABEL_DISPLAY,
  LABEL_BAR,
  scoreToLabel,
  type PredictionLabel,
} from '@/lib/utils'

interface ScoreBadgeProps {
  score: number
  label?: PredictionLabel
  confidence?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const SEBI_DISCLAIMER =
  'AI-generated score for educational purposes only. Not SEBI-registered investment advice. Past performance does not guarantee future results.'

export function ScoreBadge({
  score,
  label,
  confidence,
  size = 'md',
  showLabel = true,
}: ScoreBadgeProps) {
  const resolvedLabel = label || scoreToLabel(score)
  const displayText = LABEL_DISPLAY[resolvedLabel]
  const isLowConfidence = confidence !== undefined && confidence < 0.5

  const circleSize = { sm: 'w-10 h-10 text-sm', md: 'w-14 h-14 text-lg', lg: 'w-20 h-20 text-2xl' }
  const fontWeight = { sm: 'font-medium', md: 'font-bold', lg: 'font-extrabold' }
  const labelSize = { sm: 'text-xs', md: 'text-xs', lg: 'text-sm' }

  return (
    <Tooltip>
      <TooltipTrigger>
        <div className="flex flex-col items-center gap-1 cursor-help">
          {/* Score circle */}
          <div
            className={cn(
              'rounded-full border-2 flex items-center justify-center',
              circleSize[size],
              fontWeight[size],
              LABEL_BG[resolvedLabel],
              LABEL_COLOR[resolvedLabel],
              'border-current'
            )}
          >
            {Math.round(score)}
          </div>

          {/* Score bar */}
          {size !== 'sm' && (
            <div className="w-full max-w-[3.5rem] h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', LABEL_BAR[resolvedLabel])}
                style={{ width: `${score}%` }}
              />
            </div>
          )}

          {/* Label text */}
          {showLabel && (
            <span
              className={cn(
                'font-medium whitespace-nowrap',
                labelSize[size],
                LABEL_COLOR[resolvedLabel]
              )}
            >
              {displayText}
            </span>
          )}

          {/* Low confidence indicator */}
          {isLowConfidence && (
            <span className="text-[10px] text-slate-500 whitespace-nowrap">
              Low confidence
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs text-xs bg-slate-900 border-slate-700 text-slate-300"
      >
        <p className="font-medium mb-1">AI Score: {Math.round(score)}/100</p>
        <p className="text-slate-400">{SEBI_DISCLAIMER}</p>
      </TooltipContent>
    </Tooltip>
  )
}
