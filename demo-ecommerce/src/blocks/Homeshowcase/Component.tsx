'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { HomeShowcaseType, Product, Tag } from '@/payload-types'
import { ProductCard } from '@/components/ProductCard'
import { useLocale } from '@/lib/locale-context'
import { generateProductListSchema } from '@/utilities/generateStructuredData'
import { SectionHeading } from '@/components/SectionHeading'

type HomeShowcaseProps = HomeShowcaseType & {
  allProducts?: Product[]
  initialFilteredProducts?: Product[]
  productsByTab?: Record<string, Product[]>
}

export const HomeShowcase: React.FC<HomeShowcaseProps> = ({
  icon,
  badge,
  title,
  subtitle,
  tabs = [],
  allProducts = [],
  initialFilteredProducts,
  productsByTab = {},
}) => {
  const getTagId = (tag: any): string | null => {
    if (!tag) return null
    if (typeof tag === 'object' && 'id' in tag) return String(tag.id)
    if (typeof tag === 'string' || typeof tag === 'number') return String(tag)
    return null
  }

  const [activeTagId, setActiveTagId] = useState<string | null>(() => 
    getTagId(tabs?.[0]?.tag)
  )

  const filteredProducts = activeTagId && productsByTab[activeTagId]
    ? productsByTab[activeTagId]
    : (initialFilteredProducts || allProducts)

  const { locale } = useLocale()

  if (!tabs.length) return null

  const structuredData = generateProductListSchema(filteredProducts ?? [], locale, title || undefined)

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
        badge={badge}
        icon={icon}
        title={title}
        subtitle={subtitle}
        action={
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="inline-flex gap-1 rounded-full bg-muted p-1">
              {tabs?.map((tab, index) => {
                const tagId = getTagId(tab.tag)
                const isActive = tagId === activeTagId
                const tagLabel =
                  typeof tab.tag === 'object' && tab.tag !== null ? (tab.tag as Tag).name : `Tab ${index + 1}`

                return (
                  <button
                    key={tagId || index}
                    type="button"
                    onClick={() => setActiveTagId(tagId)}
                    className="relative shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors"
                  >
                    {isActive && (
                      <motion.span
                        layoutId="showcase-tab"
                        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                        className="absolute inset-0 rounded-full bg-card shadow-[0_1px_3px_rgba(38,35,43,0.08)]"
                      />
                    )}
                    <span className={`relative z-10 ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                      {tagLabel}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 md:gap-x-6">
        <AnimatePresence mode="popLayout">
          {filteredProducts && filteredProducts?.map((product, index) => (
            <motion.div
              key={`${activeTagId}-${product.id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <ProductCard product={product} showBadge={true} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredProducts.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Pas de produits à afficher.</p>
        </div>
      )}
    </section>
  )
}