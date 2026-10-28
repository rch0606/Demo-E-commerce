import { iconsSelect } from '@/fields/iconsSelect'
import type { Block } from 'payload'

export const HomeShowcase: Block = {
  slug: 'homeShowcase',
  interfaceName: 'HomeShowcaseType',
  imageURL: '/blocks/homeshowcase.png',
  labels: {
    singular: 'Home Showcase',
    plural: 'Home Showcases',
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
          required: true,
          localized: true,
          defaultValue: 'NEW IN',
        },
        {
          name: 'title',
          type: 'text',
          label: 'Title',
          required: true,
          defaultValue: 'Trending Now',
          localized: true,
        },
        {
          name: 'subtitle',
          type: 'textarea',
          label: 'Subtitle',
          localized: true,
        },
      ],
    },
    {
      name: 'tabs',
      type: 'array',
      label: 'Tabs',
      required: true,
      minRows: 2,
      maxRows: 4,
      fields: [
        {
          name: 'tag',
          type: 'relationship',
          label: 'Tag',
          relationTo: 'tags',
          required: true,
          maxDepth: 2,
          admin: {
            isSortable: true,
          },
        },
      ],
    },
  ],
}