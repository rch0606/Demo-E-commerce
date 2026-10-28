import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import { cache } from 'react'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import type { Locale } from '@/lib/i18n'
import { notFound, unstable_rethrow } from 'next/navigation'
import { IN_STOCK_WHERE } from '@/lib/productVisibility'

export const dynamic = 'force-dynamic'

const SUPPORTED_LOCALES = ['en', 'fr', 'ar'] as const

export async function generateStaticParams() {
  try {
    const payload = await getPayload({ config: configPromise })

    const pages = await payload.find({
      collection: 'pages',
      draft: false,
      limit: 1000,
      overrideAccess: false,
      pagination: false,
      select: { slug: true },
    })

    const pageSlugs = pages.docs
      ?.filter((doc) => Boolean(doc.slug))
      .map((doc) => ({ slug: doc.slug as string })) || []

    const staticParams = []

    for (const page of pageSlugs) {
      for (const lang of SUPPORTED_LOCALES) {
        staticParams.push({
          slug: page.slug,
          lang,
        })
      }
    }

    for (const lang of SUPPORTED_LOCALES) {
      staticParams.push({
        slug: '', 
        lang,
      })
    }

    return staticParams
  } catch (error) {
    console.error('Error generating static params:', error)
    return []
  }
}

type Args = {
  params: Promise<{
    slug?: string
    lang?: Locale
  }>
}

function getTagId(tag: any): string | null {
  if (!tag) return null
  if (typeof tag === 'object' && 'id' in tag) return String(tag.id)
  if (typeof tag === 'string' || typeof tag === 'number') return String(tag)
  return null
}

export default async function Page({ params: paramsPromise }: Args) {
  try {
    const { isEnabled: draft } = await draftMode()

    let params
    try {
      params = await paramsPromise
    } catch (error) {
      console.error('Error resolving params:', error)
      params = {}
    }

    if (!params) {
      params = {}
    }

    const slug = params?.slug || ''
    const lang = (params?.lang as Locale) || 'fr'

    const decodedSlug = slug ? decodeURIComponent(slug) : undefined
    
    const isHome = !decodedSlug || decodedSlug === 'home'

    let page = null

    if (isHome) {
      page = await queryPageBySlug({
        slug: 'home',
        locale: lang,
        draft,
      })
    } else if (decodedSlug) {
      page = await queryPageBySlug({
        slug: decodedSlug,
        locale: lang,
        draft,
      })
    }

    if (!page) {
      notFound()
    }

    // Fetch ALL products
    const productsData = await queryAllProductsByLocale({
      locale: lang,
      draft,
    })

    const heroData = page.homeHero || null
    const layout = page.layout || []
    
    const allProducts = productsData?.docs?.filter((product: any) => {
      return product && 
             typeof product === 'object' && 
             product.id && 
             product.productTitle
    }) || []

    const processedLayout = layout?.map((block) => {
      if (block.blockType === 'homeProducts') {
        return {
          ...block,
          products: allProducts
        }
      }

      // Collections saisonnières : les produits de la catégorie de chaque saison.
      if (block.blockType === 'homeSeasons') {
        const limit = Number(block.productsPerSeason ?? 4)
        const productsBySeason: Record<string, any[]> = {}
        const countBySeason: Record<string, number> = {}
        for (const season of block.seasons || []) {
          const seasonId = getTagId(season.category)
          if (!seasonId) continue
          const inSeason = allProducts.filter((product: any) =>
            (product.categories || []).some((category: any) => getTagId(category) === seasonId),
          )
          countBySeason[seasonId] = inSeason.length
          productsBySeason[seasonId] = inSeason.slice(0, limit)
        }
        return { ...block, productsBySeason, countBySeason }
      }

      if (block.blockType === 'homeShowcase') {
        const tabs = block.tabs || []
        const firstTagId = getTagId(tabs?.[0]?.tag)
        const TAB_LIMIT = 4 // Limit to 4 products per tab

        const filteredProducts = firstTagId 
          ? allProducts
              ?.filter((product: any) => {
                const productBadges = product?.badge
                if (!productBadges) return false

                if (Array.isArray(productBadges)) {
                  return productBadges.some((badge) => {
                    const badgeId = getTagId(badge)
                    return badgeId === firstTagId
                  })
                }

                const badgeId = getTagId(productBadges)
                return badgeId === firstTagId
              })
              .slice(0, TAB_LIMIT) // Limit to 4 products
          : allProducts.slice(0, TAB_LIMIT)

        const productsByTab = tabs?.reduce((acc: Record<string, any[]>, tab: any) => {
          const tagId = getTagId(tab.tag)
          if (tagId) {
            const filtered = allProducts.filter((product) => {
              const productBadges = product.badge
              if (!productBadges) return false

              if (Array.isArray(productBadges)) {
                return productBadges.some((badge) => {
                  const badgeId = getTagId(badge)
                  return badgeId === tagId
                })
              }

              const badgeId = getTagId(productBadges)
              return badgeId === tagId
            })
            // Store only 4 products per tab
            acc[tagId] = filtered.slice(0, TAB_LIMIT)
          }
          return acc
        }, {})

        return {
          ...block,
          products: filteredProducts || allProducts.slice(0, TAB_LIMIT),
          allProducts,
          initialFilteredProducts: filteredProducts,
          productsByTab,
        }
      }
      
      return block
    })

    return (
      <div className="flex min-h-dvh flex-col">
        <main className="flex-1">
          <PageClient />
          {draft && <LivePreviewListener />}
          {heroData && <RenderHero type="homeHero" homeHero={heroData} />}          
          <RenderBlocks blocks={processedLayout} allProducts={allProducts} />
        </main>
      </div>
    )
  } catch (error) {
    // notFound() lève une erreur : sans ceci, une URL inconnue affichait la
    // page d'erreur ci-dessous en 200 au lieu de la page 404.
    unstable_rethrow(error)
    console.error('Error rendering page:', error)
    return (
      <div className="flex min-h-dvh flex-col">
        <main className="flex-1">
          <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-2xl font-bold mb-4">Une erreur est survenue</h1>
            <p className="text-muted-foreground">Nous n’avons pas pu charger cette page. Merci de réessayer dans un instant.</p>
          </div>
        </main>
      </div>
    )
  }
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  try {
    let params
    try {
      params = await paramsPromise
    } catch (error) {
      console.error('Error resolving params for metadata:', error)
      params = { slug: '', lang: 'fr' }
    }

    if (!params) {
      params = { slug: '', lang: 'fr' }
    }

    const { slug = '', lang = 'fr' } = params

    if (!slug || slug === '' || slug === 'home') {
      const page = await queryPageBySlug({ 
        slug: 'home', 
        locale: lang,
        draft: false 
      })
      
      if (page) {
        return generateMeta({ doc: page })
      }
      
      return {
        title: 'Home',
        description: 'Welcome to our website',
      }
    }

    const decodedSlug = decodeURIComponent(slug)
    const page = await queryPageBySlug({ 
      slug: decodedSlug, 
      locale: lang,
      draft: false 
    })

    return generateMeta({ doc: page })
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Page',
      description: 'Page description',
    }
  }
}

const queryPageBySlug = cache(
  async ({
    slug,
    locale = 'fr',
    draft,
  }: {
    slug: string
    locale?: string
    draft: boolean
  }) => {
    try {
      if (!slug) {
        return null
      }

      const payload = await getPayload({ config: configPromise })

      const result = await payload.find({
        collection: 'pages',
        draft,
        limit: 1,
        depth: 5,
        pagination: false,
        overrideAccess: draft,
        locale: locale as any,
        where: {
          slug: {
            equals: slug,
          },
        },
      })

      return result.docs?.[0] || null
    } catch (error) {
      console.error('Error querying page by slug:', error)
      return null
    }
  },
)

// Fetch ALL products without limit
const queryAllProductsByLocale = cache(
  async ({
    locale = 'fr',
    draft,
  }: {
    locale: string
    draft: boolean
  }) => {
    try {
      const payload = await getPayload({ config: configPromise })
      const result = await payload.find({
        collection: 'products',
        draft,
        limit: 1000,
        depth: 5,
        pagination: false,
        overrideAccess: draft,
        locale: locale as any,
        // Les produits épuisés ne sont pas listés sur l'accueil.
        where: {
          ...IN_STOCK_WHERE,
          _status: {
            equals: 'published',
          },
        },
        sort: '-createdAt',
      })

      return result
    } catch (error) {
      console.error('Error querying products:', error)
      return { docs: [] }
    }
  },
)