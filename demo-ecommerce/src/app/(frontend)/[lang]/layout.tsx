import type { Metadata } from 'next'
import React from 'react'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { Locale } from '@/lib/i18n'
import { LocaleProvider } from '@/lib/locale-context'
import { Cairo, DM_Sans, Fraunces } from 'next/font/google'
import { cn } from '@/lib/utils'
import '../globals.css'
import PixelTracker from '@/components/MetaPixel'
import AnalyticsTracker from '@/components/AnalyticsTracker'
import { Suspense } from 'react'
import { AdminEditButton } from '@/components/AdminEditButton'
import { generateOrganizationSchema, generateWebsiteSchema } from '@/utilities/generateStructuredData'


export const metadata: Metadata = {
  robots: {
    index: true,
    follow: true,
  },

  ...(process.env.GOOGLE_SITE_VERIFICATION && {
    verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
  }),

  icons: {
    icon: '/brand/icon.svg', 
  },
}


const bodyFont = DM_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const displayFont = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

const cairo = Cairo({
  variable: '--font-cairo',
  subsets: ['latin', 'arabic'],
  weight: ['400', '500', '600', '700'],
})


export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params

  const locale = (lang as Locale) ?? 'fr'
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  const structuredData = [generateOrganizationSchema(), generateWebsiteSchema(locale)]

  return (
    <html
      lang={locale}
      dir={dir}
      className={cn(bodyFont.variable, displayFont.variable, cairo.variable, 'bg-background')}
      suppressHydrationWarning
    >
    <body className="font-sans antialiased">
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <PixelTracker />
      <Suspense fallback={null}>
        <AnalyticsTracker />
      </Suspense>
      <LocaleProvider>
        <Header locale={locale} />
        {children}
        <Footer locale={locale} />
      </LocaleProvider>
      <AdminEditButton />
    </body>

    </html>
  )
}