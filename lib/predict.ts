import axios from 'axios'
import { prisma } from './prisma'

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000'
const ML_KEY = process.env.ML_SERVICE_API_KEY || 'change-me-ml-secret'

export async function predictForIPO(ipoId: string): Promise<void> {
  const ipo = await prisma.iPO.findUnique({
    where: { id: ipoId },
    include: {
      gmpHistory: { orderBy: { scrapedAt: 'desc' }, take: 1 },
      subscriptions: { orderBy: { scrapedAt: 'desc' }, take: 1 },
    },
  })

  if (!ipo) throw new Error(`IPO ${ipoId} not found`)

  const latestGmp = ipo.gmpHistory[0]
  const latestSub = ipo.subscriptions[0]

  const latestMarket = await prisma.marketContext.findFirst({
    orderBy: { scrapedAt: 'desc' },
  })

  const payload = {
    ipo_name: ipo.name,
    sector: ipo.sector,
    issue_size_cr: ipo.issueSize ?? 0,
    price_band_high: ipo.priceBandHigh ?? 0,
    lot_size: ipo.lotSize ?? 0,
    gmp_percent: latestGmp?.gmpPercent ?? 0,
    qib_times: latestSub?.qibTimes ?? 0,
    hni_times: latestSub?.hniTimes ?? 0,
    retail_times: latestSub?.retailTimes ?? 0,
    total_times: latestSub?.totalTimes ?? 0,
    nifty_change_1w: latestMarket?.nifty50Chg ?? 0,
    vix_current: latestMarket?.vix ?? 15,
    pe_ratio: ipo.peRatio ?? 0,
    promoter_holding_pct: ipo.promoterHolding ?? 0,
  }

  const { data } = await axios.post(`${ML_URL}/predict`, payload, {
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
  })

  await prisma.iPOPrediction.create({
    data: {
      ipoId,
      score: data.score,
      label: data.label,
      confidence: data.confidence,
      gmpSignal: data.signals?.gmp ?? null,
      subscriptionSignal: data.signals?.subscription ?? null,
      marketSignal: data.signals?.market ?? null,
      fundamentalSignal: data.signals?.fundamentals ?? null,
      sectorSignal: data.signals?.sector ?? null,
      featuresJson: payload,
      modelVersion: data.model_version ?? '1.0.0',
      disclaimer: data.disclaimer,
    },
  })
}

export async function predictForAllOpenIPOs(): Promise<{
  success: number
  failed: number
}> {
  const ipos = await prisma.iPO.findMany({
    where: { status: { in: ['UPCOMING', 'OPEN', 'CLOSED'] } },
    select: { id: true, name: true },
  })

  let success = 0
  let failed = 0

  for (const ipo of ipos) {
    try {
      await predictForIPO(ipo.id)
      success++
    } catch (err) {
      const ts = new Date().toISOString()
      console.error(`[${ts}] [Predict] Failed for "${ipo.name}": ${err}`)
      failed++
    }
  }

  return { success, failed }
}

export async function triggerMLRetrain(): Promise<void> {
  await axios.post(
    `${ML_URL}/retrain`,
    {},
    {
      headers: { 'x-api-key': ML_KEY },
      timeout: 120000,
    }
  )
}
