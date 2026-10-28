'use client'

import Link from 'next/link'
import React from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/utilities/ui'
import { useLocale } from '@/lib/locale-context'

import type { Page, Product, Category } from '@/payload-types'

type CMSLinkType = {
  appearance?: 'inline' | ButtonProps['variant']
  className?: string
  label?: string | Record<string, string> | null
  newTab?: boolean | null
  children?: React.ReactNode
  type?: 'custom' | 'reference' | null
  size?: ButtonProps['size'] | null
  style?: React.CSSProperties
  reference?: {
    relationTo: 'pages' | 'products' | 'categories'
    value: Page | Product | Category | string | number
  } | null
  url?: string | null
  onClick?: React.MouseEventHandler<HTMLAnchorElement>
  ariaLabel?: string
}

export const CMSLink: React.FC<CMSLinkType> = ({
  appearance = 'inline',
  className,
  label,
  children,
  newTab,
  reference,
  size: sizeFromProps,
  url,
  style,
  onClick,
  ariaLabel
}) => {
  const { locale } = useLocale()

  let href: string | null = null

  const value = reference?.value as any
  const slug = typeof value === 'string' ? value : value?.slug

  if (reference?.value && slug) {
    switch (reference.relationTo) {
      case 'pages':
        href = slug === 'home' ? `/${locale}` : `/${locale}/${slug}`
        break

      case 'products':
        href = `/${locale}/produit/${slug}`
        break

      case 'categories':
        href = `/${locale}/categorie/${slug}`
        break

      default:
        href = `/${locale}/${slug}`
    }
  }

  if (!href && url) {
    const isExternal =
      url.startsWith('http') ||
      url.startsWith('https') ||
      url.startsWith('mailto:') ||
      url.startsWith('tel:')

    if (isExternal) {
      href = url
    } else {
      // Remove leading slash if present to avoid double slashes
      const cleanUrl = url.startsWith('/') ? url : `/${url}`
      href = `/${locale}${cleanUrl}`
    }
  }

  if (!href) href = `/${locale}`

  const getLabel = () => {
    if (typeof label === 'string') return label
    if (label && typeof label === 'object') {
      return label[locale] || label.en || label.fr || label.ar || ''
    }
    return null
  }

  const content = children ?? getLabel() ?? ''

  const newTabProps = newTab
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {}

  return appearance === 'inline' ? (
    <Link
      href={href}
      className={cn('no-underline hover:no-underline', className)}
      {...newTabProps}
      onClick={onClick}
    >
      {content}
    </Link>
  ) : (
    <Button asChild variant={appearance}>
      <Link href={href} {...newTabProps}>
        {content}
      </Link>
    </Button>
  )
}