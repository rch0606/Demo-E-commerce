'use client'

import Icon from '@/components/Icon'
import { HomeFeaturesType } from '@/payload-types'

/**
 * Bandeau de réassurance : une ligne discrète sous le hero. Les couleurs
 * d'icône saisies dans l'admin sont ignorées pour garder la charte douce.
 */
export const HomeFeatures: React.FC<HomeFeaturesType> = ({ features = [] }) => {
  if (!features?.length) return null

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-y-6 rounded-[1.5rem] border border-border bg-card px-4 py-6 md:grid-cols-4 md:divide-x md:divide-border md:px-2 rtl:md:divide-x-reverse">
        {features.map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-3 px-2 md:justify-center md:px-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-mist text-brand-pink">
              <Icon name={item.icon} strokeWidth={1.5} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-foreground">{item?.title}</h3>
              <p className="text-xs text-muted-foreground">{item?.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
