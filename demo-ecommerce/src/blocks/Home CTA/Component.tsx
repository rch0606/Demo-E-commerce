'use client'

import React from 'react'
import type { HomeCallToActionBlock as CTABlockProps } from '@/payload-types'
import { CMSLink } from '@/components/Link'
import Icon from '@/components/Icon'

/** Bandeau final : grand titre serif centré sur fond corail, deux boutons. */
export const HomeCallToActionBlock: React.FC<CTABlockProps> = ({ icon, badge, title, subtitle, links }) => {
  if (!title && !subtitle && !(links && links.length)) return null

  return (
    <section className="px-3 pb-16 pt-4 sm:px-4 md:pb-24">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-primary px-6 py-16 text-center md:px-12 md:py-24">
        <div aria-hidden className="pointer-events-none absolute -top-24 start-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-white/[0.06] rtl:translate-x-1/2" />

        <div className="relative z-10 mx-auto max-w-2xl">
          {badge && (
            <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-primary-foreground/70">
              {icon && <Icon name={icon} strokeWidth={1.5} className="h-3.5 w-3.5" />}
              {badge}
            </p>
          )}

          {title && (
            <h2 className="mt-4 text-balance font-heading text-4xl font-normal leading-[1.1] tracking-tight text-primary-foreground md:text-5xl">
              {title}
            </h2>
          )}

          {subtitle && (
            <p className="mx-auto mt-4 max-w-lg text-pretty text-[15px] leading-relaxed text-primary-foreground/80">{subtitle}</p>
          )}

          {links && links.length > 0 && (
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              {links.map(({ link }, i) => (
                <CMSLink
                  key={i}
                  size="lg"
                  className={
                    link?.appearance === 'outline'
                      ? 'rounded-full border border-primary-foreground/40 bg-transparent px-7 font-medium text-primary-foreground hover:bg-white/10'
                      : 'rounded-full bg-card px-7 font-medium text-foreground hover:bg-card/90'
                  }
                  {...link}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
