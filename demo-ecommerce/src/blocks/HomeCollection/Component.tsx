'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import type { HomeCollectionsType, Category } from '@/payload-types'
import { SectionHeading } from '@/components/SectionHeading'
import { cn } from '@/lib/utils'

// Keep opacity at 1 from the start so cards are visible on first paint / SSR.
// Only animate a light translate — whileInView + opacity:0 was hiding cards until scroll.
const cardVariants = {
  hidden: { opacity: 1, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.06, ease: 'easeOut' as const },
  }),
}

export const HomeCollectionsComponent: React.FC<HomeCollectionsType> = ({
  icon,
  badge,
  title,
  subtitle,
  discoverButtonText,
  collections = [],
}) => {
  if (!collections.length) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
      <SectionHeading badge={badge} icon={icon} title={title} subtitle={subtitle} />

      {/* Bento : la première collection en grand, les suivantes empilées à côté. */}
      <div className="grid auto-rows-[260px] gap-4 md:auto-rows-[240px] md:grid-cols-2 md:gap-5">
        {collections.map((collection, i) => (
          <motion.div
            key={collection.id || i}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.05, margin: '0px 0px -40px 0px' }}
            className={cn(i === 0 && collections.length > 1 && 'md:row-span-2')}
          >
            <CMSLink
              reference={{
                relationTo: 'categories',
                value: collection.category,
              }}
              aria-label={collection.collectionTitle || collection.collectionLabel || 'Collection'}
              className="group relative flex h-full overflow-hidden rounded-[1.75rem] bg-brand-mist no-underline"
            >
              <Media
                resource={collection.image}
                fill
                htmlElement={null}
                imgClassName="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                alt={collection.collectionTitle || collection.collectionLabel || 'Collection'}
                size="(max-width: 768px) 100vw, 50vw"
              />

              <div className="relative z-10 mt-auto m-4 flex w-[calc(100%-2rem)] items-end justify-between gap-4 rounded-2xl bg-card/90 p-4 backdrop-blur md:m-5 md:w-auto md:min-w-[60%] md:p-5">
                <div className="min-w-0">
                  {collection.collectionLabel && (
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {collection.collectionLabel}
                    </p>
                  )}
                  <h3 className="mt-1 text-balance font-heading text-xl font-normal text-foreground md:text-2xl">
                    {collection.collectionTitle || collection.collectionLabel || 'Collection'}
                  </h3>
                </div>
                <span
                  aria-label={discoverButtonText || undefined}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                >
                  <ArrowRight strokeWidth={1.5} className="h-4 w-4 rtl:rotate-180" />
                </span>
              </div>
            </CMSLink>
          </motion.div>
        ))}
      </div>
    </section>
  )
}