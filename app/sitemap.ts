import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const ipos = await prisma.iPO.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 1000,
  })

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
    { url: `${baseUrl}/ipos`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/performance`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ...ipos.map((ipo) => ({
      url: `${baseUrl}/ipo/${ipo.slug}`,
      lastModified: ipo.updatedAt,
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    })),
  ]
}
