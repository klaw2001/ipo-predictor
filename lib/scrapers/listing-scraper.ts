import { BaseScraper, ScraperResult } from './base-scraper'
import { prisma } from '../prisma'

interface ListingResult {
  symbol: string
  listingPrice: number
  dayHigh: number
  dayLow: number
  closePrice: number | null
}

export class ListingScraper extends BaseScraper<ListingResult[]> {
  async scrape(
    ipos?: { id: string; name: string }[]
  ): Promise<ScraperResult<ListingResult[]>> {
    this.log('Starting listing result scrape...')

    // Find IPOs listing today if none provided
    if (!ipos) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      ipos = await prisma.iPO.findMany({
        where: {
          listingDate: { gte: today, lt: tomorrow },
          status: { not: 'LISTED' },
        },
        select: { id: true, name: true },
      })
    }

    if (ipos.length === 0) {
      this.log('No IPOs listing today')
      return { success: true, data: [], scrapedAt: new Date() }
    }

    this.log(`Fetching listing prices for ${ipos.length} IPOs: ${ipos.map((i) => i.name).join(', ')}`)

    try {
      await this.launch()
      return await this.withRetry(async () => {
        const page = await this.getPage()
        const results: ListingResult[] = []

        // Visit NSE homepage to get cookies
        await page.goto('https://www.nseindia.com', {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        })
        await page.waitForTimeout(2500)

        for (const ipo of ipos!) {
          const symbol = this.guessSymbol(ipo.name)
          try {
            const data = await page.evaluate(async (sym) => {
              try {
                const res = await fetch(
                  `/api/quote-equity?symbol=${encodeURIComponent(sym)}&section=trade_info`,
                  { headers: { Accept: 'application/json' } }
                )
                if (!res.ok) return null
                return await res.json()
              } catch {
                return null
              }
            }, symbol)

            if (data?.priceInfo) {
              const info = data.priceInfo
              const result: ListingResult = {
                symbol,
                listingPrice: parseFloat(info.open || info.lastPrice || 0),
                dayHigh: parseFloat(info.intraDayHighLow?.max || info.lastPrice || 0),
                dayLow: parseFloat(info.intraDayHighLow?.min || info.lastPrice || 0),
                closePrice: info.close ? parseFloat(info.close) : null,
              }
              results.push(result)

              // Find issue price for listing gain calculation
              const ipoRecord = await prisma.iPO.findUnique({
                where: { id: ipo.id },
                select: { priceBandHigh: true },
              })
              const issuePrice = ipoRecord?.priceBandHigh || 0
              const listingGain =
                issuePrice > 0
                  ? ((result.listingPrice - issuePrice) / issuePrice) * 100
                  : 0

              // Upsert result
              await prisma.iPOResult.upsert({
                where: { ipoId: ipo.id },
                create: {
                  ipoId: ipo.id,
                  listingPrice: result.listingPrice,
                  listingGain,
                  dayHigh: result.dayHigh,
                  dayLow: result.dayLow,
                  closeD1: result.closePrice,
                },
                update: {
                  listingPrice: result.listingPrice,
                  listingGain,
                  dayHigh: result.dayHigh,
                  dayLow: result.dayLow,
                  closeD1: result.closePrice,
                },
              })

              // Update IPO status to LISTED
              await prisma.iPO.update({
                where: { id: ipo.id },
                data: { status: 'LISTED' },
              })

              this.log(
                `${ipo.name}: listing ₹${result.listingPrice} (${listingGain.toFixed(2)}%)`
              )
            }
          } catch (err) {
            this.log(`Warning: could not fetch listing for ${ipo.name}: ${err}`)
          }
        }

        await page.close()
        return { success: true, data: results, scrapedAt: new Date() }
      })
    } catch (err) {
      const error = String(err)
      this.log(`Error: ${error}`)
      return { success: false, error, scrapedAt: new Date() }
    } finally {
      await this.close()
    }
  }

  private guessSymbol(name: string): string {
    // Convert IPO name to likely NSE symbol (uppercase, no spaces, max 10 chars)
    return name
      .replace(/\s+(limited|ltd|india|technologies|tech|services|solutions)\s*$/i, '')
      .replace(/[^A-Z0-9]/gi, '')
      .toUpperCase()
      .slice(0, 10)
  }
}
