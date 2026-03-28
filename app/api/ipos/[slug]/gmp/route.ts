import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const ipo = await prisma.iPO.findUnique({ where: { slug: params.slug } })
    if (!ipo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const gmpHistory = await prisma.iPOGmp.findMany({
      where: { ipoId: ipo.id },
      orderBy: { scrapedAt: 'asc' },
    })

    return NextResponse.json({ gmpHistory, disclaimer: 'Unofficial grey market data — not regulated by SEBI.' })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch GMP' }, { status: 500 })
  }
}
