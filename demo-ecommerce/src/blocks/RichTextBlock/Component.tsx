import React from 'react'
import RichText from '@/components/RichText'
import type { RichTextBlockType } from '@/payload-types'

export const RichTextBlock: React.FC<RichTextBlockType> = ({ richText }) => {
  if (!richText) return null

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14 lg:py-16">
        <article
          className={[
            'rounded-2xl border border-border bg-card/40 shadow-sm',
            'px-5 py-8 sm:px-8 sm:py-10 lg:px-10',
            // Readable legal / CMS prose
            '[&_.prose]:mx-auto [&_.prose]:max-w-none',
            '[&_.prose]:text-foreground/90',
            '[&_.prose_h1]:font-heading [&_.prose_h1]:text-2xl [&_.prose_h1]:font-bold sm:[&_.prose_h1]:text-3xl',
            '[&_.prose_h2]:mt-8 [&_.prose_h2]:font-heading [&_.prose_h2]:text-xl [&_.prose_h2]:font-semibold',
            '[&_.prose_h3]:mt-6 [&_.prose_h3]:text-lg [&_.prose_h3]:font-semibold',
            '[&_.prose_p]:leading-relaxed [&_.prose_p]:text-sm sm:[&_.prose_p]:text-base',
            '[&_.prose_ul]:my-4 [&_.prose_ol]:my-4',
            '[&_.prose_li]:my-1 [&_.prose_li]:text-sm sm:[&_.prose_li]:text-base',
            '[&_.prose_a]:text-brand-pink [&_.prose_a]:underline-offset-2 hover:[&_.prose_a]:underline',
            '[&_.prose_strong]:font-semibold [&_.prose_strong]:text-foreground',
          ].join(' ')}
        >
          <RichText data={richText} enableProse enableGutter={false} />
        </article>
      </div>
    </section>
  )
}
