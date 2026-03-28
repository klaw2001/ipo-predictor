export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const ipo = await prisma.iPO.findUnique({ where: { slug: params.slug } })
    if (!ipo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const predictions = await prisma.iPOPrediction.findMany({
      where: { ipoId: ipo.id },
      orderBy: { predictedAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({ predictions })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 })
  }
}
