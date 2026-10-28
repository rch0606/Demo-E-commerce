import { brand } from '@/brand.config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getProductPromoPercentage, getPromoPricing } from '@/lib/categoryPromo'

export const runtime = 'nodejs'
const locale = 'fr'


function escapeXml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const payload = await getPayload({ config })

  const { docs: products } = await payload.find({
    collection: 'products',
    depth: 3,
    limit: 10000,
    draft: false,
  })

  const site = process.env.NEXT_PUBLIC_SITE_URL || brand.siteUrl

  const items = products
    .map((product: any) => {
      const title =
        typeof product.productTitle === 'string'
          ? product.productTitle
          : Object.values(product.productTitle || {})[0] || ''

      const description =
        typeof product.description === 'string'
          ? product.description
          : Object.values(product.description || {})[0] || ''

      let image: any = null

      if (
        product.featuredImage &&
        typeof product.featuredImage === 'object'
      ) {
        image = product.featuredImage
      } else if (
        product.gallery?.length &&
        product.gallery[0].image &&
        typeof product.gallery[0].image === 'object'
      ) {
        image = product.gallery[0].image
      }

      if (!title || !image?.url) {
        return null
      }

      const imageUrl = image.url.startsWith('http')
        ? image.url
        : `${site}${image.url}`

      const productUrl = `${site}/${locale}/produit/${product.slug}`

      // Sous promotion de catégorie, Meta attend le prix de référence dans
      // g:price et le prix remisé dans g:sale_price.
      const promoPercentage = getProductPromoPercentage(product)
      const pricing = getPromoPricing(Number(product.currentPrice || 0), null, promoPercentage)
      const price = Number(promoPercentage ? pricing.oldPrice : pricing.price).toFixed(3)
      const salePrice = promoPercentage ? pricing.price.toFixed(3) : null

      return `
<item>

<g:id>${product.id}</g:id>

<g:title><![CDATA[${title}]]></g:title>

<g:description><![CDATA[${description}]]></g:description>

<g:link>${escapeXml(productUrl)}</g:link>

<g:image_link>${escapeXml(imageUrl)}</g:image_link>

<g:availability>${
        product.totalStock > 0 ? 'in stock' : 'out of stock'
      }</g:availability>

<g:condition>new</g:condition>

<g:price>${price} TND</g:price>
${salePrice ? `<g:sale_price>${salePrice} TND</g:sale_price>` : ''}

<g:brand>${brand.name}</g:brand>

${
  product.barcode
    ? `<g:gtin>${product.barcode}</g:gtin>`
    : `<g:identifier_exists>no</g:identifier_exists>`
}

<g:google_product_category>1604</g:google_product_category>

</item>`
    })
    .filter(Boolean)
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>

<rss version="2.0"
xmlns:g="http://base.google.com/ns/1.0">

<channel>

<title>${brand.name}</title>

<link>${site}</link>

<description>${brand.name} Catalog</description>

${items}

</channel>

</rss>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}