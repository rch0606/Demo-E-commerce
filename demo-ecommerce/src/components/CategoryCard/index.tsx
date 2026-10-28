'use client'

import type { Category } from '@/payload-types'
import { CMSLink } from '../Link'
import { Media } from '@/components/Media'

interface CategoryCardProps {
  category: Category
  image?: any
}

/** Tuile ronde : visuel dans un cercle crème, titre en dessous. */
export function CategoryCard({ category, image }: CategoryCardProps) {
  const categoryImage = image || category?.image || null

  return (
    <CMSLink
      reference={{
        relationTo: 'categories',
        value: category,
      }}
      className="group flex flex-col items-center gap-3 text-center no-underline"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-full bg-brand-mist ring-1 ring-border transition-all duration-500 group-hover:ring-4 group-hover:ring-brand-haze">
        {categoryImage && typeof categoryImage === 'object' && (
          <Media
            resource={categoryImage}
            fill
            imgClassName="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            priority={false}
          />
        )}
      </div>
      <h3 className="font-heading text-base font-normal text-foreground md:text-lg">{category?.title}</h3>
    </CMSLink>
  )
}
