import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { slugField } from 'payload'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { revalidateDelete, revalidatePage } from './hooks/revalidatePage'
import { HomeHero } from '@/heros/HomeHero/config'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import { HomeFeatures } from '@/blocks/HomeFeatures/config'
import { HomeCategories } from '@/blocks/HomeCategories/config'
import { HomeProducts } from '@/blocks/HomeProducts/config'
import { HomeShowcase } from '@/blocks/Homeshowcase/config'
import { HomeCollections } from '@/blocks/HomeCollection/config'
import { HomeSeasons } from '@/blocks/HomeSeasons/config'
import { HomeTestimonials } from '@/blocks/HomeTestimonials/config'
import { HomePromo } from '@/blocks/HomePromo/config'
import { CallToAction } from '@/blocks/CallToAction/config'
import { MediaBlock } from '@/blocks/MediaBlock/config'
import { FormBlock } from '@/blocks/Form/config'
import { adminOnly } from '@/access/adminOnly'
import { adminOrSeo } from '@/access/adminOrSeo'
import { RichTextBlock } from '@/blocks/RichTextBlock/config'
import { HomeFAQ } from '@/blocks/HomeFAQ/config'
import { HomeCTA } from '@/blocks/Home CTA/config'

export const Pages: CollectionConfig<'pages'> = {
  slug: 'pages',
  access: {
  create:  adminOrSeo,
  delete: adminOrSeo,
  read: authenticatedOrPublished,
  update: adminOrSeo,
},
  
  defaultPopulate: {
    title: true,
    slug: true,
  },
  admin: {
    group: 'SEO',
    defaultColumns: ['title', 'slug', 'updatedAt'],
     hidden: ({ user }) => {
    return user?.role !== 'admin' && user?.role !== 'seo'
  },
        livePreview: {
      url: ({ data, locale }) => {
        const localeObj = locale as any
        const lang = typeof localeObj === 'string' 
          ? localeObj 
          : (localeObj?.code || 'fr')
        
        return generatePreviewPath({
          slug: data?.slug,
          collection: 'pages',
          lang,
        })
      },
    },

    preview: (data, { locale }) => {
      const localeObj = locale as any
      const lang = typeof localeObj === 'string' 
        ? localeObj 
        : (localeObj?.code || 'fr')
      
      return generatePreviewPath({
        slug: String(data?.slug || ''),
        collection: 'pages',
        lang,
      })
    },
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
         {
          label: 'Hero',
          fields: [HomeHero],
           admin: {
            condition: (data, siblingData) => {
              return data?.slug === 'home'
            },
          },
        },
        {
          fields: [
            {
              name: 'layout',
              type: 'blocks',
              blocks: [ HomeFeatures, HomeCategories, HomeProducts, HomeShowcase, HomeSeasons, HomeCollections, HomeTestimonials, HomePromo, 
                CallToAction, MediaBlock, FormBlock, RichTextBlock, HomeFAQ, HomeCTA],
              required: false,
              admin: {
                initCollapsed: true,
              },
            },
          ],
          label: 'Content',
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'media',
            }),

            MetaDescriptionField({}),
            PreviewField({
              hasGenerateFn: true,
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
    },
    slugField(),
  ],
  hooks: {
    afterChange: [revalidatePage],
    beforeChange: [populatePublishedAt],
    afterDelete: [revalidateDelete],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 100, // We set this interval for optimal live preview
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
