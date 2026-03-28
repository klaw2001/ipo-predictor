export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const sector = searchParams.get('sector')
  const category = searchParams.get('category')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = 20

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (sector) where.sector = sector
  if (category) where.category = category

  try {
    const [ipos, total] = await Promise.all([
      prisma.iPO.findMany({
        where,
        include: {
          predictions: { orderBy: { predictedAt: 'desc' }, take: 1 },
          gmpHistory: { orderBy: { scrapedAt: 'desc' }, take: 1 },
          subscriptions: { orderBy: { scrapedAt: 'desc' }, take: 1 },
          result: true,
        },
        orderBy: [{ openDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.iPO.count({ where }),
    ])

    return NextResponse.json({
      ipos,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('[API /ipos]', err)
    return NextResponse.json({ error: 'Failed to fetch IPOs' }, { status: 500 })
  }
}
