'use client'

import type { StaticImageData } from 'next/image'

import { cn } from '@/utilities/ui'
import NextImage from 'next/image'
import React from 'react'

import type { Props as MediaProps } from '../types'

import { cssVariables } from '@/cssVariables'
import { getMediaUrl } from '@/utilities/getMediaUrl'

const { breakpoints } = cssVariables

/**
 * Light neutral grey LQIP — used only for filled images (cards, heroes, galleries).
 * Logos / inline images stay transparent (no grey box behind transparent PNGs).
 */
const placeholderBlur =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="100%" height="100%" fill="#e5e7eb"/></svg>`,
  )

/**
 * ImageMedia
 *
 * - `fill` images (product cards, heroes): grey plate + blur so you never see black while loading
 * - inline images (header/footer logo): no grey background, no blur (transparent PNGs stay clean)
 */
export const ImageMedia: React.FC<MediaProps> = (props) => {
  const {
    alt: altFromProps,
    fill,
    pictureClassName,
    imgClassName,
    priority,
    resource,
    size: sizeFromProps,
    src: srcFromProps,
    loading: loadingFromProps,
  } = props

  let width: number | undefined
  let height: number | undefined
  let alt = altFromProps
  let src: StaticImageData | string = srcFromProps || ''

  if (!src && resource && typeof resource === 'object') {
    const { alt: altFromResource, height: fullHeight, url, width: fullWidth } = resource

    width = fullWidth!
    height = fullHeight!
    alt = altFromResource || ''

    const cacheTag = resource.updatedAt

    src = getMediaUrl(url, cacheTag)
  }

  const loading = loadingFromProps || (!priority ? 'lazy' : undefined)

  const sizes = sizeFromProps
    ? sizeFromProps
    : Object.entries(breakpoints)
        .map(([, value]) => `(max-width: ${value}px) ${value * 2}w`)
        .join(', ')

  // Grey plate only for cover-style images (fill). Logos must stay transparent.
  const showGreyPlate = Boolean(fill)

  return (
    <picture
      className={cn(
        showGreyPlate && 'bg-[#e5e7eb]',
        fill && 'absolute inset-0 block h-full w-full',
        pictureClassName,
      )}
      style={showGreyPlate ? { backgroundColor: '#e5e7eb' } : undefined}
    >
      <NextImage
        alt={alt || ''}
        className={cn(imgClassName)}
        fill={fill}
        height={!fill ? height : undefined}
        {...(showGreyPlate
          ? { placeholder: 'blur' as const, blurDataURL: placeholderBlur }
          : { placeholder: 'empty' as const })}
        priority={priority}
        quality={80}
        loading={loading}
        sizes={sizes}
        src={src}
        width={!fill ? width : undefined}
      />
    </picture>
  )
}
