import { BaseScraper, ScraperResult } from './base-scraper'
import { prisma } from '../prisma'

interface GmpEntry {
  ipoName: string
  issuePrice: number
  expectedListing: number
  gmpAmount: number
  gmpPercent: number
  kostak: number | null
  subject: number | null
}

export class GmpScraper extends BaseScraper<GmpEntry[]> {
  private readonly url = 'https://www.investorgain.com/report/live-ipo-gmp/331/'

  async scrape(): Promise<ScraperResult<GmpEntry[]>> {
    this.log('Starting GMP scrape from investorgain.com...')
    try {
      await this.launch()
      return await this.withRetry(async () => {
        const page = await this.getPage()

        await page.goto(this.url, {
          waitUntil: 'networkidle',
          timeout: 45000,
        })

        // Wait for the table to appear (React-rendered)
        await page.waitForSelector('table', { timeout: 20000 })

        const html = await page.content()
        await this.saveRawHtml(html, 'investorgain-gmp')

        const entries = await page.evaluate(() => {
          const rows = Array.from(document.querySelectorAll('table tbody tr'))
          return rows
            .map((row) => {
              const cells = Array.from(row.querySelectorAll('td'))
              if (cells.length < 5) return null

              const parseNum = (s: string): number => {
                const clean = s.replace(/[₹,%\s]/g, '').replace(/[()]/g, '')
                const n = parseFloat(clean)
                return isNaN(n) ? 0 : n
              }

              const ipoName = cells[0]?.textContent?.trim() || ''
              if (!ipoName || ipoName.length < 2) return null

              const issuePrice = parseNum(cells[1]?.textContent || '0')
              const gmpText = cells[2]?.textContent?.trim() || '0'
              const gmpAmount = parseNum(gmpText)
              const expectedListing = issuePrice + gmpAmount
              const gmpPercent = issuePrice > 0 ? (gmpAmount / issuePrice) * 100 : 0
              const kostak = parseNum(cells[4]?.textContent || '0') || null
              const subject = parseNum(cells[5]?.textContent || '0') || null

              return {
                ipoName,
                issuePrice,
                expectedListing: Math.round(expectedListing * 100) / 100,
                gmpAmount,
                gmpPercent: Math.round(gmpPercent * 100) / 100,
                kostak,
                subject,
              }
            })
            .filter(Boolean) as GmpEntry[]
        })

        await page.close()

        if (entries.length === 0) {
          throw new Error('No GMP entries parsed — possible page structure change')
        }

        // Save to DB by matching IPO names
        await this.saveGmpData(entries)
        this.log(`Saved GMP data for ${entries.length} entries`)

        return { success: true, data: entries, scrapedAt: new Date() }
      })
    } catch (err) {
      const error = String(err)
      this.log(`Error: ${error}`)
      return { success: false, error, scrapedAt: new Date() }
    } finally {
      await this.close()
    }
  }

  private async saveGmpData(entries: GmpEntry[]): Promise<void> {
    // Get all IPOs that are not yet listed
    const activeIPOs = await prisma.iPO.findMany({
      where: { status: { in: ['UPCOMING', 'OPEN', 'CLOSED'] } },
      select: { id: true, name: true, slug: true, priceBandHigh: true },
    })

    for (const entry of entries) {
      // Fuzzy match IPO by name
      const matchedIPO = this.matchIPO(entry.ipoName, activeIPOs)
      if (!matchedIPO) continue

      await prisma.iPOGmp.create({
        data: {
          ipoId: matchedIPO.id,
          gmpAmount: entry.gmpAmount,
          gmpPercent: entry.gmpPercent,
          kostak: entry.kostak,
          subject: entry.subject,
          source: 'investorgain.com',
        },
      })
    }
  }

  private matchIPO(
    gmpName: string,
    ipos: { id: string; name: string; slug: string }[]
  ): { id: string; name: string } | null {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        // Strip common suffixes: "IPO U", "IPO", "SME", "BSE SME U", "NSE SME", status chars
        .replace(/\s+(bse\s+sme|nse\s+sme|sme|ipo)\s*[a-z]?\s*$/i, '')
        .replace(/\s+ipo\s*$/i, '')
        // Strip company suffixes: ltd, limited, pvt, etc.
        .replace(/\s+(ltd\.?|limited|pvt\.?|private|exports|industries|india)\.?\s*$/i, '')
        .replace(/[^a-z0-9]/g, '')

    const gmpNorm = normalize(gmpName)

    // Exact match first
    let match = ipos.find((ipo) => normalize(ipo.name) === gmpNorm)
    if (match) return match

    // Partial match (one contains the other)
    match = ipos.find(
      (ipo) =>
        normalize(ipo.name).includes(gmpNorm) ||
        gmpNorm.includes(normalize(ipo.name))
    )

    return match || null
  }
}
