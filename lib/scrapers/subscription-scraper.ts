import { BaseScraper, ScraperResult } from './base-scraper'
import { prisma } from '../prisma'

interface SubscriptionData {
  ipoName: string
  day: number
  qibTimes: number
  hniTimes: number
  retailTimes: number
  totalTimes: number
  employeeTimes: number | null
  applications: number | null
  source: string
}

export class SubscriptionScraper extends BaseScraper<SubscriptionData[]> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async scrape(_ipoSlugs?: string[]): Promise<ScraperResult<SubscriptionData[]>> {
    this.log('Starting subscription data scrape...')
    try {
      await this.launch()
      return await this.withRetry(async () => {
        const page = await this.getPage()
        const allData: SubscriptionData[] = []

        // NSE scrape via API (requires cookie from homepage visit)
        try {
          this.log('Fetching NSE subscription data...')
          // CRITICAL: Visit NSE homepage first to establish session cookies
          await page.goto('https://www.nseindia.com', {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          })
          await page.waitForTimeout(3000) // Allow cookies to set

          // Call NSE API from within the page context to use session cookies
          const nseData = await page.evaluate(async () => {
            try {
              const res = await fetch('/api/allIpo?category=ipo', {
                headers: {
                  Accept: 'application/json',
                  'X-Requested-With': 'XMLHttpRequest',
                },
              })
              if (!res.ok) return null
              return await res.json()
            } catch {
              return null
            }
          })

          if (nseData?.data) {
            const parsed = this.parseNSEData(nseData.data)
            allData.push(...parsed)
            this.log(`NSE: parsed ${parsed.length} subscription records`)
          }
        } catch (err) {
          this.log(`NSE scrape failed (will try BSE): ${err}`)
        }

        // BSE scrape as fallback / supplement
        try {
          this.log('Fetching BSE subscription data...')
          await page.goto(
            'https://www.bseindia.com/markets/PublicIssues/IPOOpenSubscription.aspx',
            { waitUntil: 'domcontentloaded', timeout: 30000 }
          )
          await page.waitForSelector('table', { timeout: 15000 })

          const html = await page.content()
          await this.saveRawHtml(html, 'bse-subscription')

          const bseData = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table tr'))
            return rows
              .slice(1)
              .map((row) => {
                const cells = Array.from(row.querySelectorAll('td'))
                if (cells.length < 6) return null
                return {
                  name: cells[0]?.textContent?.trim() || '',
                  qib: parseFloat(cells[1]?.textContent?.replace(/[^0-9.]/g, '') || '0'),
                  hni: parseFloat(cells[2]?.textContent?.replace(/[^0-9.]/g, '') || '0'),
                  retail: parseFloat(cells[3]?.textContent?.replace(/[^0-9.]/g, '') || '0'),
                  total: parseFloat(cells[4]?.textContent?.replace(/[^0-9.]/g, '') || '0'),
                }
              })
              .filter(Boolean)
          })

          if (bseData.length > 0) {
            const parsed = bseData.map((d) => ({
              ipoName: d!.name,
              day: 1,
              qibTimes: d!.qib || 0,
              hniTimes: d!.hni || 0,
              retailTimes: d!.retail || 0,
              totalTimes: d!.total || 0,
              employeeTimes: null,
              applications: null,
              source: 'BSE',
            }))
            allData.push(...parsed)
            this.log(`BSE: parsed ${parsed.length} subscription records`)
          }
        } catch (err) {
          this.log(`BSE scrape failed: ${err}`)
        }

        await page.close()
        await this.saveSubscriptionData(allData)

        return { success: true, data: allData, scrapedAt: new Date() }
      })
    } catch (err) {
      const error = String(err)
      this.log(`Error: ${error}`)
      return { success: false, error, scrapedAt: new Date() }
    } finally {
      await this.close()
    }
  }

  private parseNSEData(data: unknown[]): SubscriptionData[] {
    if (!Array.isArray(data)) return []
    return data
      .map((rawItem: unknown) => {
        const item = rawItem as Record<string, unknown>
        if (!item || typeof item !== 'object') return null
        const name = String(item.companyName || item.symbol || '')
        if (!name) return null

        const parseNum = (v: unknown) => {
          const n = parseFloat(String(v || '0').replace(/[^0-9.]/g, ''))
          return isNaN(n) ? 0 : n
        }

        return {
          ipoName: name,
          day: parseInt(String(item.subscriptionDay || '1')) || 1,
          qibTimes: parseNum(item.qib),
          hniTimes: parseNum(item.hni || item.nii),
          retailTimes: parseNum(item.rii || item.retail),
          totalTimes: parseNum(item.total),
          employeeTimes: item.emp ? parseNum(item.emp) : null,
          applications: item.applications ? parseInt(String(item.applications)) : null,
          source: 'NSE',
        }
      })
      .filter(Boolean) as SubscriptionData[]
  }

  private async saveSubscriptionData(entries: SubscriptionData[]): Promise<void> {
    const activeIPOs = await prisma.iPO.findMany({
      where: { status: 'OPEN' },
      select: { id: true, name: true },
    })

    for (const entry of entries) {
      const ipo = this.matchIPO(entry.ipoName, activeIPOs)
      if (!ipo) continue

      await prisma.iPOSubscription.create({
        data: {
          ipoId: ipo.id,
          day: entry.day,
          qibTimes: entry.qibTimes,
          hniTimes: entry.hniTimes,
          retailTimes: entry.retailTimes,
          totalTimes: entry.totalTimes,
          employeeTimes: entry.employeeTimes,
          applications: entry.applications,
          source: entry.source,
        },
      })
    }
  }

  private matchIPO(
    name: string,
    ipos: { id: string; name: string }[]
  ): { id: string } | null {
    const norm = (s: string) =>
      s.toLowerCase().replace(/\s+ipo\s*$/i, '').replace(/[^a-z0-9]/g, '')
    const n = norm(name)
    return (
      ipos.find((i) => norm(i.name) === n || norm(i.name).includes(n) || n.includes(norm(i.name))) ||
      null
    )
  }
}
