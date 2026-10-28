import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

export type GlobalSlug = 'header' | 'footer'

async function getGlobal(
  slug: GlobalSlug,
  depth = 0,
  locale?: string,
) {
  const payload = await getPayload({ config: configPromise })

  const global = await payload.findGlobal({
    slug,
    depth,
    locale: locale as any,
  })

  return global
}


export const getCachedGlobal = (
  slug: GlobalSlug,
  depth = 0,
  locale?: string,
) =>
  unstable_cache(
    async () => getGlobal(slug, depth, locale),
    [slug, locale ?? 'default'],
    {
      tags: [
        `global_${slug}`,
        `global_${slug}_${locale ?? 'default'}`,
      ],
    },
  )