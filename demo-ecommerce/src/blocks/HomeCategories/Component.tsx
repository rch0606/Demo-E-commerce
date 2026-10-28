'use client'

import { CategoryCard } from '@/components/CategoryCard'
import { SectionHeading } from '@/components/SectionHeading'
import type { Category, HomeCategoriesType } from '@/payload-types'
import { useLocale } from '@/lib/locale-context'
import { generateCategoryListSchema } from '@/utilities/generateStructuredData'

export const HomeCategories: React.FC<HomeCategoriesType> = ({
  title,
  subtitle,
  categories = [],
}) => {
  const { locale } = useLocale()

  if (!categories?.length) return null

  // Seules les catégories complètes (avec slug) ont une URL à déclarer.
  const linkedCategories = categories.filter(
    (category): category is Category => typeof category === 'object' && category !== null && Boolean(category.slug),
  )

  // Helper function to get a unique key for each category
  const getCategoryKey = (category: any, index: number): string => {
    if (!category) return `category-${index}`
    if (typeof category === 'string') return `category-${category}-${index}`
    if (typeof category === 'object') {
      return category.id || category.slug || `category-${index}`
    }
    return `category-${index}`
  }

  // Helper function to get category object
  const getCategoryObject = (category: any): any => {
    if (!category) return null
    if (typeof category === 'object') return category
    // If it's a string ID, we need to handle it
    if (typeof category === 'string') {
      // You might want to fetch the full category object here
      // or return a minimal object with the ID
      return { id: category, title: category }
    }
    return null
  }

  const structuredData = linkedCategories.length > 0
      ? generateCategoryListSchema(linkedCategories, locale, title || undefined)
      : null

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <SectionHeading title={title} subtitle={subtitle} align="center" />
      <div className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-3 md:gap-x-6 lg:grid-cols-6">
        {categories.map((category: any, index: number) => {
          const categoryObj = getCategoryObject(category)
          if (!categoryObj) return null
          
          return (
            <CategoryCard 
              key={getCategoryKey(category, index)} 
              category={categoryObj} 
            />
          )
        })}
      </div>
    </section>
  )
}