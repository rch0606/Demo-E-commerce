'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { HomeSeasonsType, Product } from '@/payload-types'
import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import { useLocale } from '@/lib/locale-context'
import { cn } from '@/lib/utils'
import { seasonMood } from '@/lib/seasonMood'

type HomeSeasonsProps = HomeSeasonsType & {
  /** Aperçus produits de chaque saison, indexés par id de catégorie (calculés côté serveur). */
  productsBySeason?: Record<string, Product[]>
  /** Nombre total de produits de chaque saison. */
  countBySeason?: Record<string, number>
}

const COUNT: Record<string, (n: number) => string> = {
  fr: (n) => `${n} article${n > 1 ? 's' : ''}`,
  ar: (n) => `${n} منتج`,
  en: (n) => `${n} item${n > 1 ? 's' : ''}`,
}

const categoryId = (value: unknown): string | null => {
  const id = value && typeof value === 'object' ? (value as { id?: unknown }).id : value
  return id == null ? null : String(id)
}


const productImage = (product: Product) => {
  if (product.featuredImage && typeof product.featuredImage === 'object') return product.featuredImage
  const first = (product.gallery as any[] | undefined)?.find((item) => item?.image && typeof item.image === 'object')
  return first?.image ?? null
}

export const HomeSeasons: React.FC<HomeSeasonsProps> = ({
  badge,
  title,
  subtitle,
  seasons = [],
  productsBySeason = {},
  countBySeason = {},
}) => {
  const { locale } = useLocale()

  if (!seasons?.length) return null

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <div className="mb-8 text-center">
        {badge && (
          <span className="inline-flex items-center rounded-full bg-brand-pink/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-pink">
            {badge}
          </span>
        )}
        <h2 className="mt-3 text-balance font-heading text-3xl font-bold md:text-4xl">{title}</h2>
        {subtitle && <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">{subtitle}</p>}
      </div>

      {/* Panneaux côte à côte : celui survolé s'élargit (desktop). */}
      <div className="flex flex-col gap-4 md:h-[440px] md:flex-row">
        {seasons.map((season, index) => {
          const id = categoryId(season.category)
          const previews = (id && productsBySeason[id]) || []
          const total = (id && countBySeason[id]) || previews.length
          const mood = seasonMood(season.category)
          const Icon = mood.icon
          const withImage = Boolean(season.image && typeof season.image === 'object')
          const hasCategory = Boolean(season.category && typeof season.category === 'object')

          return (
            <article
              key={season.id || index}
              className={cn(
                'group relative flex min-h-[340px] flex-1 flex-col justify-end overflow-hidden rounded-[2rem] p-6 transition-[flex-grow] duration-500 ease-out md:p-8 md:hover:flex-[1.45]',
                withImage ? 'bg-foreground text-white' : cn(mood.background, 'text-foreground'),
              )}
            >
              {withImage ? (
                <>
                  <Media
                    resource={season.image}
                    fill
                    htmlElement={null}
                    imgClassName="object-cover transition-transform duration-700 group-hover:scale-105"
                    alt={season.label || ''}
                    size="(max-width: 768px) 100vw, 60vw"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </>
              ) : (
                <>
                  {/* Décor : halo coloré et grande icône de saison. */}
                  <span className={cn('absolute -end-16 -top-16 h-64 w-64 rounded-full blur-3xl', mood.glow)} />
                  <Icon
                    className={cn(
                      'absolute end-6 top-6 h-24 w-24 opacity-25 transition-transform duration-700 group-hover:rotate-12 md:h-32 md:w-32',
                      mood.tint,
                    )}
                    strokeWidth={1.25}
                    aria-hidden
                  />
                </>
              )}

              <div className="relative z-10">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur',
                    withImage ? 'bg-white/20' : 'bg-white/70',
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', !withImage && mood.tint)} aria-hidden />
                  {(COUNT[locale] ?? COUNT.fr)(total)}
                </span>

                <h3 className="mt-3 font-heading text-4xl font-extrabold tracking-tight md:text-5xl">{season.label}</h3>
                {season.description && (
                  <p className={cn('mt-2 max-w-sm text-sm md:text-base', withImage ? 'text-white/90' : 'text-foreground/75')}>
                    {season.description}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  {/* Aperçus : quelques produits en pastilles qui se chevauchent. */}
                  {previews.length > 0 && (
                    <div className="flex items-center">
                      {previews.map((product, i) => {
                        const image = productImage(product)
                        return (
                          <Link
                            key={product.id}
                            href={`/${locale}/produit/${product.slug}`}
                            title={String(product.productTitle ?? '')}
                            className={cn(
                              'relative h-14 w-14 overflow-hidden rounded-full border-[3px] border-white bg-white shadow-md transition-transform duration-300 hover:z-10 hover:-translate-y-1 md:h-16 md:w-16',
                              i > 0 && '-ms-4',
                            )}
                          >
                            {image && (
                              <Media
                                resource={image}
                                fill
                                htmlElement={null}
                                imgClassName="object-cover"
                                alt={String(product.productTitle ?? '')}
                                size="64px"
                              />
                            )}
                          </Link>
                        )
                      })}
                      {total > previews.length && (
                        <span className="-ms-4 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white bg-[#a3462a] text-xs font-bold text-white shadow-md md:h-16 md:w-16">
                          +{total - previews.length}
                        </span>
                      )}
                    </div>
                  )}

                  {hasCategory && (
                    <CMSLink
                      reference={{ relationTo: 'categories', value: season.category as any }}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white no-underline shadow-lg transition-colors',
                        withImage ? 'bg-white/20 backdrop-blur hover:bg-white/30' : mood.button,
                      )}
                    >
                      {season.buttonText || 'Voir toute la collection'}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                    </CMSLink>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
