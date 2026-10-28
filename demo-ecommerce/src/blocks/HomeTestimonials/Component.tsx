// blocks/HomeTestimonials/Component.tsx
'use client'

import { motion } from 'framer-motion'
import { Star, BadgeCheck } from 'lucide-react'
import Icon from '@/components/Icon'
import { Media } from '@/components/Media'
import { SectionHeading } from '@/components/SectionHeading'
import type { HomeTestimonialsType } from '@/payload-types'

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease: 'easeOut' as const },
  }),
}

function Stars({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label="5 / 5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${className} fill-brand-gold text-brand-gold`} aria-hidden />
      ))}
    </div>
  )
}

/**
 * Avis clients : citation mise en avant à gauche, avis courts à droite,
 * chiffres clés en bas. Les couleurs d'icône de l'admin sont ignorées.
 */
export const HomeTestimonials: React.FC<HomeTestimonialsType> = ({
  icon,
  badge,
  title,
  subtitle,
  featuredImage,
  featuredText,
  featuredName,
  featuredLocation,
  verifiedLabel = 'Verified Purchase',
  reviews = [],
  stats = [],
}) => {
  if (!reviews.length && !featuredText) return null

  return (
    <section className="px-3 py-8 sm:px-4 md:py-12">
      <div className="mx-auto max-w-7xl border-y border-border px-1 py-14 sm:px-2 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <SectionHeading badge={badge} icon={icon} title={title} subtitle={subtitle} className="mb-8 md:mb-10" />

            {featuredText && (
              <motion.figure
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5 }}
              >
                <Stars className="h-4 w-4" />
                <blockquote className="mt-5 font-heading text-xl font-normal leading-relaxed text-foreground md:text-2xl">
                  “{featuredText}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  {featuredImage && typeof featuredImage === 'object' && (
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                      <Media resource={featuredImage} fill imgClassName="object-cover" />
                    </span>
                  )}
                  <span>
                    <span className="block text-sm font-medium text-foreground">{featuredName}</span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {featuredLocation}
                      {verifiedLabel && (
                        <>
                          <span aria-hidden>·</span>
                          <BadgeCheck strokeWidth={1.5} className="h-3.5 w-3.5 text-brand-green" />
                          {verifiedLabel}
                        </>
                      )}
                    </span>
                  </span>
                </figcaption>
              </motion.figure>
            )}
          </div>

          {reviews.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {reviews.map((review, i) => (
                <motion.figure
                  key={review.id || i}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.1 }}
                  className="flex flex-col rounded-2xl bg-card p-5 shadow-[0_1px_2px_rgba(38,35,43,0.04)]"
                >
                  <Stars />
                  <blockquote className="mt-3 flex-1 text-[14px] leading-relaxed text-foreground/80">
                    {review.reviewText}
                  </blockquote>
                  <figcaption className="mt-4 flex items-center gap-2.5 border-t border-border pt-4">
                    {review.avatar && typeof review.avatar === 'object' && (
                      <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
                        <Media resource={review.avatar} fill imgClassName="object-cover" />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-foreground">{review.name}</span>
                      {review.location && (
                        <span className="block truncate text-[11px] text-muted-foreground">{review.location}</span>
                      )}
                    </span>
                  </figcaption>
                </motion.figure>
              ))}
            </div>
          )}
        </div>

        {stats.length > 0 && (
          <dl className="mt-12 grid grid-cols-2 gap-y-8 border-t border-foreground/10 pt-10 md:mt-16 md:grid-cols-4">
            {stats.map((stat, i) => (
              <div key={stat.id || i} className="flex flex-col items-center gap-1 text-center">
                {stat.icon && <Icon name={stat.icon} strokeWidth={1.5} className="mb-1 h-5 w-5 text-brand-pink" />}
                <dt className="order-2 text-xs text-muted-foreground">{stat.label}</dt>
                <dd className="order-1 font-heading text-3xl font-normal text-foreground md:text-4xl">{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  )
}
