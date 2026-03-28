import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get all IPO results with their latest predictions
    const results = await prisma.iPOResult.findMany({
      include: {
        ipo: {
          include: {
            predictions: { orderBy: { predictedAt: 'asc' }, take: 1 },
          },
        },
      },
    })

    if (results.length === 0) {
      return NextResponse.json({
        totalPredictions: 0,
        accuracy: 0,
        byLabel: {},
        bySector: {},
        recentAccuracy: { last10: 0, last20: 0, last50: 0 },
        scatterData: [],
      })
    }

    // Build scatter data (predicted vs actual)
    const scatterData = results
      .filter((r) => r.ipo.predictions.length > 0)
      .map((r) => ({
        ipoName: r.ipo.name,
        predictedScore: r.ipo.predictions[0].score,
        predictedLabel: r.ipo.predictions[0].label,
        actualGain: r.listingGain,
        listingPrice: r.listingPrice,
        sector: r.ipo.sector,
      }))

    // Overall accuracy (correct direction: positive predicted → positive actual)
    const correct = scatterData.filter((d) => {
      const predictedPositive = d.predictedScore >= 50
      const actualPositive = d.actualGain >= 0
      return predictedPositive === actualPositive
    }).length
    const accuracy = results.length > 0 ? (correct / scatterData.length) * 100 : 0

    // By label accuracy
    const labelGroups: Record<string, { correct: number; total: number }> = {}
    scatterData.forEach((d) => {
      if (!labelGroups[d.predictedLabel]) labelGroups[d.predictedLabel] = { correct: 0, total: 0 }
      labelGroups[d.predictedLabel].total++
      const isPositive = d.predictedScore >= 50
      const actualPositive = d.actualGain >= 0
      if (isPositive === actualPositive) labelGroups[d.predictedLabel].correct++
    })
    const byLabel = Object.fromEntries(
      Object.entries(labelGroups).map(([k, v]) => [
        k,
        { accuracy: v.total > 0 ? (v.correct / v.total) * 100 : 0, total: v.total },
      ])
    )

    // By sector accuracy
    const sectorGroups: Record<string, { correct: number; total: number }> = {}
    scatterData.forEach((d) => {
      if (!sectorGroups[d.sector]) sectorGroups[d.sector] = { correct: 0, total: 0 }
      sectorGroups[d.sector].total++
      if ((d.predictedScore >= 50) === (d.actualGain >= 0)) sectorGroups[d.sector].correct++
    })
    const bySector = Object.fromEntries(
      Object.entries(sectorGroups).map(([k, v]) => [
        k,
        { accuracy: v.total > 0 ? (v.correct / v.total) * 100 : 0, total: v.total },
      ])
    )

    // Rolling accuracy
    const calcRolling = (n: number) => {
      const slice = scatterData.slice(-n)
      if (slice.length === 0) return 0
      const c = slice.filter((d) => (d.predictedScore >= 50) === (d.actualGain >= 0)).length
      return (c / slice.length) * 100
    }

    return NextResponse.json({
      totalPredictions: scatterData.length,
      accuracy: Math.round(accuracy * 10) / 10,
      byLabel,
      bySector,
      recentAccuracy: {
        last10: Math.round(calcRolling(10) * 10) / 10,
        last20: Math.round(calcRolling(20) * 10) / 10,
        last50: Math.round(calcRolling(50) * 10) / 10,
      },
      scatterData,
    })
  } catch (err) {
    console.error('[API /performance]', err)
    return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 })
  }
}
