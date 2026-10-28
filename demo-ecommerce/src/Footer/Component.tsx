import { getCachedGlobal } from '@/utilities/getGlobals'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import type { Footer as FooterType } from '@/payload-types'
import { FooterClient } from './Component.client'
import type { Locale } from '@/lib/i18n'

type Props = {
  locale?: Locale
}

export async function Footer({ locale }: Props) {
  const safeLocale = locale ?? 'fr'

 const payload = await getPayload({
  config: configPromise,
})

const footerData = await payload.findGlobal({
  slug: 'footer',
  depth: 1,
  locale: safeLocale,
})

  const { docs: categories = [] } = await payload.find({
    collection: 'categories',
    limit: 100,
    sort: 'title',
    locale: safeLocale,
  })

  return (
    <FooterClient
      footer={footerData}
      categories={categories}
    />
  )
}