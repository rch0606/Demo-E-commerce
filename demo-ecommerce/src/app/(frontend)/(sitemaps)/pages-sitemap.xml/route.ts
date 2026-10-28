import { brand } from '@/brand.config'
import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

const getPagesSitemap = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const SITE_URL =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      brand.siteUrl

    // Default locale used on the live site
    const DEFAULT_LOCALE = 'fr'
    const dateFallback = new Date().toISOString()

    // Static / high-priority routes
    const defaultSitemap = [
      {
        loc: `${SITE_URL}/${DEFAULT_LOCALE}`,
        lastmod: dateFallback,
      },
      {
        loc: `${SITE_URL}/${DEFAULT_LOCALE}/boutique`,
        lastmod: dateFallback,
      },
    ]

    // Published CMS pages
    const pages = await payload.find({
      collection: 'pages',
      overrideAccess: false,
      draft: false,
      depth: 0,
      limit: 1000,
      pagination: false,
      where: {
        _status: {
          equals: 'published',
        },
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    })

    const pagesSitemap =
      pages.docs
        ?.filter((page) => Boolean(page?.slug))
        .map((page) => {
          // home is already covered by /fr
          if (page.slug === 'home') {
            return {
              loc: `${SITE_URL}/${DEFAULT_LOCALE}`,
              lastmod: page.updatedAt || dateFallback,
            }
          }
          return {
            loc: `${SITE_URL}/${DEFAULT_LOCALE}/${page.slug}`,
            lastmod: page.updatedAt || dateFallback,
          }
        }) || []

    // Categories
    const categories = await payload.find({
      collection: 'categories',
      overrideAccess: false,
      draft: false,
      depth: 0,
      limit: 500,
      pagination: false,
      select: {
        slug: true,
        updatedAt: true,
      },
    })

    const categoriesSitemap =
      categories.docs
        ?.filter((cat) => Boolean(cat?.slug))
        .map((cat) => ({
          loc: `${SITE_URL}/${DEFAULT_LOCALE}/categorie/${cat.slug}`,
          lastmod: cat.updatedAt || dateFallback,
        })) || []

    // Deduplicate by loc (home appears twice otherwise)
    const allEntries = [
      ...defaultSitemap,
      ...pagesSitemap,
      ...categoriesSitemap,
    ]

    const uniqueMap = new Map<string, { loc: string; lastmod: string }>()
    for (const entry of allEntries) {
      uniqueMap.set(entry.loc, entry)
    }

    return Array.from(uniqueMap.values())
  },
  ['pages-sitemap'],
  {
    tags: ['pages-sitemap'],
  },
)

export async function GET() {
  const sitemap = await getPagesSitemap()
  return getServerSideSitemap(sitemap)
}
