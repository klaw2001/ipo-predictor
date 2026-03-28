import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const ipo = await prisma.iPO.findUnique({ where: { slug: params.slug } })
    if (!ipo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const subscriptions = await prisma.iPOSubscription.findMany({
      where: { ipoId: ipo.id },
      orderBy: { scrapedAt: 'asc' },
    })

    return NextResponse.json({ subscriptions })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
  }
}
