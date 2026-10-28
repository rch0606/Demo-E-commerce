'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'
import { Media } from '@/components/Media'

type Props = {
  images: string[]
  alt: string
  imageClassName?: string
  /** Set true for the first visible cards above the fold */
  priority?: boolean
}

export function ProductImageCarousel({
  images,
  alt,
  imageClassName,
  priority = false,
}: Props) {
  const { dir } = useLocale()
  const slides = images.length > 0 ? images : ['/placeholder.svg']
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  const hasMultiple = slides.length > 1

  const go = (next: number, dirSign: number) => {
    const total = slides.length
    const clamped = (next + total) % total
    setDirection(dirSign)
    setIndex(clamped)
  }

  const prev = () => go(index - 1, -1)
  const next = () => go(index + 1, 1)

  const isRtl = dir === 'rtl'

  const variants = {
    enter: (d: number) => ({ x: `${d * 100}%`, opacity: 0.4 }),
    center: { x: '0%', opacity: 1 },
    exit: (d: number) => ({ x: `${d * -100}%`, opacity: 0.4 }),
  }

  const currentSrc = slides[index] || '/placeholder.svg'

  return (
    <div className="absolute inset-0 overflow-hidden">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={index}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          drag={hasMultiple ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            const threshold = 60
            if (info.offset.x < -threshold) {
              isRtl ? prev() : next()
            } else if (info.offset.x > threshold) {
              isRtl ? next() : prev()
            }
          }}
        >
          <Media
            // string URLs are supported by ImageMedia at runtime
            src={currentSrc as any}
            alt={alt}
            fill
            htmlElement={null}
            priority={priority && index === 0}
            size="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            imgClassName={
              imageClassName ??
              'object-cover transition-transform duration-500 group-hover:scale-105'
            }
          />
        </motion.div>
      </AnimatePresence>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              isRtl ? next() : prev()
            }}
            aria-label="Previous image"
            className="absolute start-2 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground opacity-0 shadow transition-opacity hover:bg-background group-hover:opacity-100 sm:flex"
          >
            <ChevronLeft className="h-4 w-4 rtl:hidden" />
            <ChevronRight className="hidden h-4 w-4 rtl:block" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              isRtl ? prev() : next()
            }}
            aria-label="Next image"
            className="absolute end-2 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground opacity-0 shadow transition-opacity hover:bg-background group-hover:opacity-100 sm:flex"
          >
            <ChevronRight className="h-4 w-4 rtl:hidden" />
            <ChevronLeft className="hidden h-4 w-4 rtl:block" />
          </button>

          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  go(i, i > index ? 1 : -1)
                }}
                aria-label={`Go to image ${i + 1}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? 'w-5 bg-brand-pink'
                    : 'w-1.5 bg-background/80 hover:bg-background'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
