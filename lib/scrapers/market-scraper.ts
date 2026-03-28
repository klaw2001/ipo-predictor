import { BaseScraper, ScraperResult } from './base-scraper'
import { prisma } from '../prisma'

interface MarketData {
  nifty50: number
  nifty50Chg: number
  bankNifty: number
  bankNiftyChg: number
  vix: number
  marketStatus: string
}

export class MarketScraper extends BaseScraper<MarketData> {
  async scrape(): Promise<ScraperResult<MarketData>> {
    this.log('Starting market context scrape from NSE...')
    try {
      await this.launch()
      return await this.withRetry(async () => {
        const page = await this.getPage()

        // CRITICAL: Visit NSE homepage first to establish session cookies
        await page.goto('https://www.nseindia.com', {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        })
        await page.waitForTimeout(2500)

        // Fetch index data via NSE's internal API using page session
        const indices = await page.evaluate(async () => {
          try {
            const res = await fetch('/api/allIndices', {
              headers: { Accept: 'application/json' },
            })
            if (!res.ok) return null
            return await res.json()
          } catch {
            return null
          }
        })

        await page.close()

        if (!indices?.data) {
          throw new Error('NSE allIndices API returned no data')
        }

        const find = (name: string) =>
          (indices.data as Array<{ index: string; last: number; percentChange: number }>).find(
            (i) => i.index?.toLowerCase().includes(name.toLowerCase())
          )

        const nifty = find('NIFTY 50') || find('NIFTY50')
        const bankNifty = find('BANK NIFTY') || find('BANKNIFTY')
        const vix = find('INDIA VIX') || find('VIX')

        if (!nifty) throw new Error('Could not find NIFTY 50 in NSE response')

        const data: MarketData = {
          nifty50: nifty.last,
          nifty50Chg: nifty.percentChange,
          bankNifty: bankNifty?.last || 0,
          bankNiftyChg: bankNifty?.percentChange || 0,
          vix: vix?.last || 15,
          marketStatus: this.getMarketStatus(),
        }

        await prisma.marketContext.create({ data })
        this.log(
          `Market data saved: Nifty=${data.nifty50} (${data.nifty50Chg}%), VIX=${data.vix}`
        )

        return { success: true, data, scrapedAt: new Date() }
      })
    } catch (err) {
      const error = String(err)
      this.log(`Error: ${error}`)
      return { success: false, error, scrapedAt: new Date() }
    } finally {
      await this.close()
    }
  }

  private getMarketStatus(): string {
    // IST market hours: 9:15am - 3:30pm Mon-Fri
    const now = new Date()
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const day = ist.getDay() // 0=Sun, 6=Sat
    const hour = ist.getHours()
    const min = ist.getMinutes()
    const timeVal = hour * 60 + min

    if (day === 0 || day === 6) return 'CLOSED'
    if (timeVal >= 9 * 60 + 15 && timeVal <= 15 * 60 + 30) return 'OPEN'
    if (timeVal >= 9 * 60 && timeVal < 9 * 60 + 15) return 'PRE_OPEN'
    return 'CLOSED'
  }
}
