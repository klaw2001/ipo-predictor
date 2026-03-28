import { NextRequest, NextResponse } from 'next/server'
import { ChittorgarhScraper } from '@/lib/scrapers/chittorgarh-scraper'
import { GmpScraper } from '@/lib/scrapers/gmp-scraper'
import { SubscriptionScraper } from '@/lib/scrapers/subscription-scraper'
import { MarketScraper } from '@/lib/scrapers/market-scraper'
import { ListingScraper } from '@/lib/scrapers/listing-scraper'
import { predictForAllOpenIPOs } from '@/lib/predict'

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { scraper?: string } = {}
  try {
    body = await request.json()
  } catch {
    // scraper not required
  }

  const scraperName = body.scraper || 'chittorgarh'

  try {
    let result
    switch (scraperName) {
      case 'chittorgarh':
        result = await new ChittorgarhScraper().scrape()
        break
      case 'gmp':
        result = await new GmpScraper().scrape()
        break
      case 'subscription':
        result = await new SubscriptionScraper().scrape()
        break
      case 'market':
        result = await new MarketScraper().scrape()
        break
      case 'listing':
        result = await new ListingScraper().scrape()
        break
      default:
        return NextResponse.json({ error: `Unknown scraper: ${scraperName}` }, { status: 400 })
    }

    if (result.success) {
      await predictForAllOpenIPOs()
    }

    return NextResponse.json({
      success: result.success,
      scraper: scraperName,
      error: result.error,
      scrapedAt: result.scrapedAt,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
