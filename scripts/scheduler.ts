/**
 * Standalone scheduler process — run as a separate Docker service.
 * DO NOT import this in Next.js — hot reloads would kill cron state.
 *
 * Run with: npx tsx scripts/scheduler.ts
 * Requires TZ=Asia/Kolkata environment variable.
 */

import cron from 'node-cron'
import { ChittorgarhScraper } from '../lib/scrapers/chittorgarh-scraper'
import { GmpScraper } from '../lib/scrapers/gmp-scraper'
import { SubscriptionScraper } from '../lib/scrapers/subscription-scraper'
import { MarketScraper } from '../lib/scrapers/market-scraper'
import { ListingScraper } from '../lib/scrapers/listing-scraper'
import { predictForAllOpenIPOs, triggerMLRetrain } from '../lib/predict'
import { prisma } from '../lib/prisma'

const log = (msg: string) => console.log(`[${new Date().toISOString()}] [Scheduler] ${msg}`)

// ── IPO list scrape every 6 hours ────────────────────────────────────────────
cron.schedule('0 */6 * * *', async () => {
  log('Running Chittorgarh IPO list scrape...')
  try {
    const scraper = new ChittorgarhScraper()
    const result = await scraper.scrape()
    log(`Chittorgarh: ${result.success ? `OK (${result.data?.length} IPOs)` : `FAILED: ${result.error}`}`)
    if (result.success) await predictForAllOpenIPOs()
  } catch (err) {
    log(`Chittorgarh scrape error: ${err}`)
  }
})

// ── GMP scrape every 4 hours ──────────────────────────────────────────────────
cron.schedule('0 */4 * * *', async () => {
  log('Running GMP scrape...')
  try {
    const scraper = new GmpScraper()
    const result = await scraper.scrape()
    log(`GMP: ${result.success ? `OK (${result.data?.length} entries)` : `FAILED: ${result.error}`}`)
    if (result.success) {
      const { success, failed } = await predictForAllOpenIPOs()
      log(`Re-predicted ${success} IPOs (${failed} failed)`)
    }
  } catch (err) {
    log(`GMP scrape error: ${err}`)
  }
})

// ── Subscription scrape — 9am, 11am, 1pm, 3pm IST, Mon–Fri ──────────────────
cron.schedule('0 9,11,13,15 * * 1-5', async () => {
  log('Running subscription scrape...')
  try {
    const openIPOs = await prisma.iPO.findMany({
      where: { status: 'OPEN' },
      select: { slug: true },
    })
    if (openIPOs.length === 0) {
      log('No open IPOs — skipping subscription scrape')
      return
    }
    const scraper = new SubscriptionScraper()
    const result = await scraper.scrape(openIPOs.map((i) => i.slug))
    log(`Subscription: ${result.success ? `OK (${result.data?.length} records)` : `FAILED: ${result.error}`}`)
    if (result.success) await predictForAllOpenIPOs()
  } catch (err) {
    log(`Subscription scrape error: ${err}`)
  }
})

// ── Market context — every hour 9am–4pm IST, Mon–Fri ────────────────────────
cron.schedule('0 9-16 * * 1-5', async () => {
  log('Running market context scrape...')
  try {
    const scraper = new MarketScraper()
    const result = await scraper.scrape()
    log(`Market: ${result.success ? `Nifty=${result.data?.nifty50} VIX=${result.data?.vix}` : `FAILED: ${result.error}`}`)
  } catch (err) {
    log(`Market scrape error: ${err}`)
  }
})

// ── Listing results — 10:30am and 4:00pm IST, Mon–Fri ────────────────────────
async function runListingScrape() {
  log('Running listing result scrape...')
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const listingToday = await prisma.iPO.findMany({
      where: {
        listingDate: { gte: today, lt: tomorrow },
        status: { not: 'LISTED' },
      },
      select: { id: true, name: true },
    })

    if (listingToday.length === 0) {
      log('No IPOs listing today')
      return
    }

    const scraper = new ListingScraper()
    const result = await scraper.scrape(listingToday)
    log(`Listing: ${result.success ? `OK (${result.data?.length} results)` : `FAILED: ${result.error}`}`)
  } catch (err) {
    log(`Listing scrape error: ${err}`)
  }
}

cron.schedule('30 10 * * 1-5', runListingScrape)
cron.schedule('0 16 * * 1-5', runListingScrape)

// ── Weekly ML retrain — Sunday 2am IST ───────────────────────────────────────
cron.schedule('0 2 * * 0', async () => {
  log('Running weekly ML model retrain...')
  try {
    await triggerMLRetrain()
    log('Model retrain complete')
  } catch (err) {
    log(`Model retrain failed: ${err}`)
  }
})

log('Scheduler started. All crons registered.')
log(`Timezone: ${process.env.TZ || 'NOT SET — please set TZ=Asia/Kolkata'}`)

// Keep process alive
process.on('SIGTERM', async () => {
  log('SIGTERM received, shutting down...')
  await prisma.$disconnect()
  process.exit(0)
})
