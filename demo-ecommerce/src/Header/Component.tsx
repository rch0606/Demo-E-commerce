import { HeaderClient } from './Component.client'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import type {
  Header as HeaderType,
} from '@/payload-types'

import type { Locale } from '@/lib/i18n'

type Props = {
  locale?: Locale
}

export async function Header({ locale }: Props) {
  const safeLocale = locale ?? 'fr'

  const headerData =
    (await getCachedGlobal(
      'header',
      1,
      safeLocale,
    )()) as HeaderType

  const payload = await getPayload({
    config: configPromise,
  })

  const { docs: categories = [] } = await payload.find({
    collection: 'categories',
    limit: 100,
    sort: 'title',
    depth: 1,
    locale: safeLocale,
  })

  return (
    <HeaderClient
      header={headerData}
      categories={categories}
    />
  )
}