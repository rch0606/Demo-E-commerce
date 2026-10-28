'use client'

import { ArrowRight } from 'lucide-react'
import { ProductCard } from '@/components/ProductCard'
import { CMSLink } from '@/components/Link'
import { SectionHeading } from '@/components/SectionHeading'
import type { Product, HomeProductsType } from '@/payload-types'
import { useLocale } from '@/lib/locale-context'
import { generateProductListSchema } from '@/utilities/generateStructuredData'

type HomeProductsProps = HomeProductsType & {
  products: Product[]
}

export const HomeProducts: React.FC<HomeProductsProps> = ({
  title,
  products = [],
  cta 
}) => {
  const { locale } = useLocale()
  // Limiter à 8 produits maximum
  const displayProducts = products?.slice(0, 8) || []

  if (!displayProducts.length) {
    return null
  }

  const structuredData = generateProductListSchema(displayProducts, locale, title || undefined)

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <SectionHeading
        title={title}
        action={
          cta?.link && (
            <CMSLink
              {...cta.link}
              className="group inline-flex items-center gap-2 rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              {cta?.link?.label}
              <ArrowRight strokeWidth={1.5} className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
            </CMSLink>
          )
        }
      />
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
        {displayProducts.map((product: any, index) => (
          <ProductCard 
            key={product?.id || `product-${index}`} 
            product={product} 
          />
        ))}
      </div>
    </section>
  )
}