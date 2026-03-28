import slugify from 'slugify'
import { BaseScraper, ScraperResult } from './base-scraper'
import { prisma } from '../prisma'

interface RawIPORow {
  name: string
  detailUrl: string | null
  openDate: string | null
  closeDate: string | null
  listingDate: string | null
  priceBand: string | null
  lotSize: string | null
  issueSize: string | null
  status: string
}

interface ParsedIPO {
  name: string
  slug: string
  openDate: Date | null
  closeDate: Date | null
  listingDate: Date | null
  priceBandLow: number | null
  priceBandHigh: number | null
  issueSize: number | null
  lotSize: number | null
  category: 'SME' | 'MAINBOARD'
  status: string
}

export class ChittorgarhScraper extends BaseScraper<ParsedIPO[]> {
  // Main IPO list — tracks upcoming, open, and recently closed/listed IPOs
  private readonly urls = [
    'https://www.chittorgarh.com/report/latest-ipo-in-india-ipo-list-2024/83/',
    'https://www.chittorgarh.com/report/latest-ipo-in-india-ipo-list-2025/83/',
  ]

  async scrape(): Promise<ScraperResult<ParsedIPO[]>> {
    this.log('Starting Chittorgarh IPO list scrape...')
    try {
      await this.launch()
      return await this.withRetry(async () => {
        const page = await this.getPage()
        const allIPOs: ParsedIPO[] = []

        for (const url of this.urls) {
          try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
            await page.waitForSelector('table', { timeout: 15000 })

            const html = await page.content()
            await this.saveRawHtml(html, 'chittorgarh')

            const rows = await page.evaluate(() => {
              const tables = document.querySelectorAll('table')
              const results: RawIPORow[] = []

              tables.forEach((table) => {
                const rows = Array.from(table.querySelectorAll('tbody tr'))
                rows.forEach((row) => {
                  const cells = Array.from(row.querySelectorAll('td'))
                  if (cells.length < 4) return

                  const nameEl = cells[0]?.querySelector('a')
                  const name = nameEl?.textContent?.trim() || cells[0]?.textContent?.trim() || ''
                  if (!name || name.length < 2) return

                  results.push({
                    name,
                    detailUrl: nameEl?.getAttribute('href') || null,
                    openDate: cells[1]?.textContent?.trim() || null,
                    closeDate: cells[2]?.textContent?.trim() || null,
                    listingDate: cells[3]?.textContent?.trim() || null,
                    priceBand: cells[4]?.textContent?.trim() || null,
                    lotSize: cells[5]?.textContent?.trim() || null,
                    issueSize: cells[6]?.textContent?.trim() || null,
                    status: cells[7]?.textContent?.trim() || 'UPCOMING',
                  })
                })
              })
              return results
            })

            const parsed = rows
              .filter((r) => r.name)
              .map((r) => this.parseRow(r))

            allIPOs.push(...parsed)
          } catch (err) {
            this.log(`Warning: failed to scrape ${url}: ${err}`)
          }
        }

        await page.close()

        if (allIPOs.length === 0) {
          throw new Error('No IPOs parsed from Chittorgarh — possible page structure change')
        }

        // Deduplicate by slug
        const seen = new Set<string>()
        const unique = allIPOs.filter((ipo) => {
          if (seen.has(ipo.slug)) return false
          seen.add(ipo.slug)
          return true
        })

        await this.upsertIPOs(unique)
        this.log(`Scraped and upserted ${unique.length} IPOs`)

        return { success: true, data: unique, scrapedAt: new Date() }
      })
    } catch (err) {
      const error = String(err)
      this.log(`Error: ${error}`)
      return { success: false, error, scrapedAt: new Date() }
    } finally {
      await this.close()
    }
  }

  private parseRow(raw: RawIPORow): ParsedIPO {
    const name = raw.name.replace(/\s+IPO\s*$/i, '').trim()
    const slug = slugify(name, { lower: true, strict: true })

    // Parse price band e.g. "₹50 - ₹55" or "50-55" or "55"
    let priceBandLow: number | null = null
    let priceBandHigh: number | null = null
    if (raw.priceBand && raw.priceBand !== '-' && raw.priceBand !== 'N/A') {
      const nums = raw.priceBand.replace(/[₹,]/g, '').match(/[\d.]+/g)
      if (nums) {
        if (nums.length === 1) {
          priceBandLow = parseFloat(nums[0])
          priceBandHigh = parseFloat(nums[0])
        } else if (nums.length >= 2) {
          priceBandLow = parseFloat(nums[0])
          priceBandHigh = parseFloat(nums[nums.length - 1])
        }
      }
    }

    const lotSize = raw.lotSize ? parseInt(raw.lotSize.replace(/[^0-9]/g, '')) || null : null
    const issueSize = raw.issueSize
      ? parseFloat(raw.issueSize.replace(/[^0-9.]/g, '')) || null
      : null

    // Detect SME from URL or name
    const isSME =
      raw.detailUrl?.includes('/sme/') ||
      raw.name.toLowerCase().includes('sme') ||
      false

    return {
      name,
      slug,
      openDate: this.parseDate(raw.openDate),
      closeDate: this.parseDate(raw.closeDate),
      listingDate: this.parseDate(raw.listingDate),
      priceBandLow,
      priceBandHigh,
      issueSize,
      lotSize,
      category: isSME ? 'SME' : 'MAINBOARD',
      status: this.mapStatus(raw.status, raw.openDate, raw.closeDate, raw.listingDate),
    }
  }

  private parseDate(dateStr: string | null): Date | null {
    if (!dateStr || dateStr === '-' || dateStr === 'N/A' || dateStr.trim() === '') return null
    try {
      // Chittorgarh uses formats like "10-Jan-2025", "Jan 10, 2025", "10 Jan 2025"
      const cleaned = dateStr.trim().replace(/(\d+)[\/\-](\d+)[\/\-](\d+)/, '$2/$1/$3')
      const d = new Date(cleaned)
      if (isNaN(d.getTime())) return null
      return d
    } catch {
      return null
    }
  }

  private mapStatus(
    status: string,
    openDate: string | null,
    closeDate: string | null,
    listingDate: string | null
  ): string {
    const s = (status || '').toLowerCase()
    if (s.includes('listed') || s.includes('allot')) {
      if (listingDate) return 'LISTED'
      return 'CLOSED'
    }
    if (s.includes('close') || s.includes('closed')) return 'CLOSED'
    if (s.includes('open') || s.includes('ongoing') || s.includes('live')) return 'OPEN'
    if (s.includes('upcoming') || s.includes('forthcoming') || s.includes('announced'))
      return 'UPCOMING'

    // Infer from dates
    const now = new Date()
    if (openDate) {
      const open = this.parseDate(openDate)
      const close = this.parseDate(closeDate)
      const listing = this.parseDate(listingDate)

      if (listing && now >= listing) return 'LISTED'
      if (close && now > close) return 'CLOSED'
      if (open && now >= open) return 'OPEN'
    }
    return 'UPCOMING'
  }

  private async upsertIPOs(ipos: ParsedIPO[]): Promise<void> {
    for (const ipo of ipos) {
      try {
        await prisma.iPO.upsert({
          where: { slug: ipo.slug },
          create: {
            slug: ipo.slug,
            name: ipo.name,
            category: ipo.category,
            status: ipo.status,
            sector: 'Other',
            issuerCompany: ipo.name,
            exchange: 'BOTH',
            priceBandLow: ipo.priceBandLow,
            priceBandHigh: ipo.priceBandHigh,
            issueSize: ipo.issueSize,
            lotSize: ipo.lotSize,
            openDate: ipo.openDate,
            closeDate: ipo.closeDate,
            listingDate: ipo.listingDate,
          },
          update: {
            status: ipo.status,
            priceBandLow: ipo.priceBandLow ?? undefined,
            priceBandHigh: ipo.priceBandHigh ?? undefined,
            issueSize: ipo.issueSize ?? undefined,
            lotSize: ipo.lotSize ?? undefined,
            openDate: ipo.openDate ?? undefined,
            closeDate: ipo.closeDate ?? undefined,
            listingDate: ipo.listingDate ?? undefined,
          },
        })
      } catch (err) {
        this.log(`Warning: could not upsert IPO "${ipo.name}": ${err}`)
      }
    }
  }
}
