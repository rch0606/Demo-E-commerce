'use client'

import Link from 'next/link'
import React from 'react'

import { Button } from '@/components/ui/button'
import { useLocale } from '@/lib/locale-context'

/** Textes propres à cette page : le 404 n'a pas sa place dans les dictionnaires partagés. */
const COPY = {
  fr: {
    title: 'Page introuvable',
    text: 'La page que vous cherchez n’existe pas ou a été déplacée.',
    shop: 'Voir la boutique',
    home: 'Retour à l’accueil',
  },
  ar: {
    title: 'الصفحة غير موجودة',
    text: 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.',
    shop: 'تصفح المتجر',
    home: 'العودة إلى الرئيسية',
  },
  en: {
    title: 'Page not found',
    text: 'The page you are looking for does not exist or has been moved.',
    shop: 'Browse the shop',
    home: 'Back to home',
  },
} as const

export default function NotFound() {
  const { locale } = useLocale()
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.fr

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-heading text-6xl font-bold text-brand-pink">404</p>
      <h1 className="mt-4 font-heading text-2xl font-bold">{copy.title}</h1>
      <p className="mt-2 max-w-md text-muted-foreground">{copy.text}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href={`/${locale}/boutique`}>{copy.shop}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/${locale}`}>{copy.home}</Link>
        </Button>
      </div>
    </div>
  )
}
