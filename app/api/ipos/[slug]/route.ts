import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const ipo = await prisma.iPO.findUnique({
      where: { slug: params.slug },
      include: {
        predictions: { orderBy: { predictedAt: 'desc' }, take: 10 },
        gmpHistory: { orderBy: { scrapedAt: 'asc' } },
        subscriptions: { orderBy: { scrapedAt: 'asc' } },
        result: true,
      },
    })

    if (!ipo) {
      return NextResponse.json({ error: 'IPO not found' }, { status: 404 })
    }

    return NextResponse.json(ipo)
  } catch (err) {
    console.error(`[API /ipos/${params.slug}]`, err)
    return NextResponse.json({ error: 'Failed to fetch IPO' }, { status: 500 })
  }
}
