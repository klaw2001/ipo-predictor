import { chromium, Browser, BrowserContext, Page } from 'playwright'
import fs from 'fs/promises'
import path from 'path'

export interface ScraperResult<T> {
  success: boolean
  data?: T
  error?: string
  scrapedAt: Date
  rawHtmlPath?: string
}

export abstract class BaseScraper<T> {
  protected browser: Browser | null = null
  protected context: BrowserContext | null = null
  protected maxRetries = 3
  protected baseDelay = 2000

  abstract scrape(...args: unknown[]): Promise<ScraperResult<T>>

  protected async launch(): Promise<void> {
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH

    this.browser = await chromium.launch({
      headless: true,
      executablePath: executablePath || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
      ],
    })

    this.context = await this.browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata',
      extraHTTPHeaders: {
        'Accept-Language': 'en-IN,en;q=0.9',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    })

    // Block images, fonts, and media to speed up scraping
    await this.context.route(
      '**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf,otf,mp4,mp3}',
      (route) => route.abort()
    )
  }

  protected async getPage(): Promise<Page> {
    if (!this.context) throw new Error('Browser not launched — call launch() first')
    const page = await this.context.newPage()

    // Hide automation markers
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] })
      Object.defineProperty(navigator, 'languages', { get: () => ['en-IN', 'en'] })
    })

    return page
  }

  protected async withRetry<R>(fn: () => Promise<R>): Promise<R> {
    let lastError: Error | undefined
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn()
      } catch (err) {
        lastError = err as Error
        const delay = this.baseDelay * Math.pow(2, attempt - 1)
        const ts = new Date().toISOString()
        console.warn(
          `[${ts}] [Scraper] Attempt ${attempt}/${this.maxRetries} failed: ${lastError.message}. Retrying in ${delay}ms...`
        )
        await new Promise((r) => setTimeout(r, delay))
      }
    }
    throw lastError
  }

  protected async saveRawHtml(html: string, prefix: string): Promise<string> {
    const filename = `${prefix}-${Date.now()}.html`
    const filePath = path.join('/tmp', filename)
    try {
      await fs.writeFile(filePath, html, 'utf-8')
      return filePath
    } catch {
      return ''
    }
  }

  protected log(message: string): void {
    const ts = new Date().toISOString()
    console.log(`[${ts}] [${this.constructor.name}] ${message}`)
  }

  async close(): Promise<void> {
    await this.context?.close().catch(() => {})
    await this.browser?.close().catch(() => {})
    this.context = null
    this.browser = null
  }
}
