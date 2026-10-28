import { colorSelect } from '@/fields/colorSelect'
import { iconsSelect } from '@/fields/iconsSelect'
import type { Block } from 'payload'

export const HomeCollections: Block = {
  slug: 'homeCollections',
  interfaceName: 'HomeCollectionsType',
  imageURL: '/blocks/homecollection.png',
  labels: {
    singular: 'Home Collections',
    plural: 'Home Collections',
  },
  fields: [
    {
      type: 'collapsible',
      label: 'Badge',
      fields: [
        iconsSelect({
          name: 'icon',
          required: true,
        }),
        {
          name: 'badge',
          type: 'text',
          label: 'Badge Text',
          localized: true,
          defaultValue: 'Collections',
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Content',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Section Title',
          required: true,
          localized: true,
          defaultValue: 'Discover Our Collections',
        },
        {
          name: 'subtitle',
          type: 'textarea',
          label: 'Section Subtitle',
          localized: true,
          defaultValue: 'Explore our carefully curated collections designed for every moment',
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Collections',
      fields: [
        {
          name: 'discoverButtonText',
          type: 'text',
          label: 'Discover Button Text',
          localized: true,
          required: true,
        },
        {
          name: 'collections',
          type: 'array',
          label: 'Collections',
          required: true,
          minRows: 2,
          maxRows: 8,
          fields: [
            iconsSelect({
              name: 'iconcollection',
              required: false,
              label: 'Collection Card Icon',
            }),
            colorSelect({
              name: 'colorcollection',
              required: false,
              label: 'Icon Color',
            }),
            {
              name: 'collectionLabel',
              type: 'text',
              label: 'Collection Label',
              localized: true,
              defaultValue: 'COLLECTION',
            },
            {
              name: 'collectionTitle',
              type: 'text',
              label: 'Collection Title',
              localized: true,
            },

            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              label: 'Collection Image',
              required: true,
            },
            {
              name: 'category',
              type: 'relationship',
              relationTo: 'categories',
              label: 'Category',
              required: true,
              admin: {
                description: 'Select the category for this collection',
              },
            },
          ],
        },
      ],
    },
  ],
}