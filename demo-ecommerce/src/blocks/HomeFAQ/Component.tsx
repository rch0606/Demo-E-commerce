'use client'

import { useState } from 'react'
import { generateFAQSchema } from '@/utilities/generateStructuredData'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import { SectionHeading } from '@/components/SectionHeading'
import type { HomeFAQType } from '@/payload-types'
import { cn } from '@/lib/utils'

/** FAQ en deux colonnes : titre à gauche, questions séparées par des filets à droite. */
export const HomeFAQ: React.FC<HomeFAQType> = ({ icon, badge, title, subtitle, items = [] }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  if (!items?.length) return null

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index))
  }

  const structuredData = generateFAQSchema(items ?? [])

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
          }}
        />
      )}

      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeading badge={badge} icon={icon} title={title} subtitle={subtitle} className="mb-0 md:mb-0" />
        </div>

        <div className="border-t border-border">
          {items.map((item, index) => {
            const isOpen = openIndex === index
            const questionId = `faq-question-${index}`
            const answerId = `faq-answer-${index}`

            return (
              <div key={item.id || index} className="border-b border-border">
                <button
                  type="button"
                  id={questionId}
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between gap-6 py-5 text-start md:py-6"
                >
                  <span className="font-heading text-lg font-normal leading-snug text-foreground md:text-xl">
                    {item.question}
                  </span>
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-300',
                      isOpen ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground',
                    )}
                  >
                    <Plus
                      strokeWidth={1.5}
                      className={cn('h-4 w-4 transition-transform duration-300', isOpen && 'rotate-45')}
                      aria-hidden
                    />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={answerId}
                      role="region"
                      aria-labelledby={questionId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-6 pe-12 text-pretty text-[15px] leading-relaxed text-muted-foreground">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
