export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const latest = await prisma.marketContext.findFirst({
      orderBy: { scrapedAt: 'desc' },
    })
    return NextResponse.json({ market: latest })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 })
  }
}
