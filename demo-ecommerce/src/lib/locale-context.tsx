'use client'

import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from 'react'
import { useParams } from 'next/navigation'

import type { Locale } from '@/lib/i18n'
import { defaultLocale, localeConfig } from '@/lib/i18n'

import en from '@/dictionnaries/en'
import fr from '@/dictionnaries/fr'
import ar from '@/dictionnaries/ar'

const dictionaries = { en, fr, ar } as const

type Dictionary = (typeof dictionaries)[Locale]

interface LocaleContextType {
  locale: Locale
  dir: 'ltr' | 'rtl'
  t: Dictionary
}

const LocaleContext = createContext<LocaleContextType | null>(null)

export function LocaleProvider({
  children,
}: {
  children: ReactNode
}) {
  const params = useParams()

  const locale: Locale =
    Object.hasOwn(dictionaries, params?.lang as string)
      ? (params?.lang as Locale)
      : defaultLocale

  const dir = localeConfig[locale].direction
  const t = dictionaries[locale]

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = dir
  }, [locale, dir])

  return (
    <LocaleContext.Provider
      value={{
        locale,
        dir,
        t,
      }}
    >
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)

  if (!context) {
    throw new Error(
      'useLocale must be used within a LocaleProvider'
    )
  }

  return context
}