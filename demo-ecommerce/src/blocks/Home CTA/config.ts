import type { Block } from 'payload'
import { iconsSelect } from '@/fields/iconsSelect'
import { linkGroup } from '../../fields/linkGroup'

export const HomeCTA: Block = {
  slug: 'homeCTA',
  interfaceName: 'HomeCallToActionBlock',
  imageURL: '/blocks/cta.png',
  labels: {
    plural: 'Home CTAs',
    singular: 'Home CTA',
  },
  fields: [
    {
      type: 'collapsible',
      label: 'Badge',
      fields: [
        iconsSelect({
          name: 'icon',
          required: false,
        }),
        {
          name: 'badge',
          type: 'text',
          label: 'Badge Text',
          localized: true,
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
          label: 'Title',
          required: true,
          localized: true,
          defaultValue: 'Ready to find the perfect fit?',
        },
        {
          name: 'subtitle',
          type: 'textarea',
          label: 'Subtitle',
          localized: true,
          defaultValue: 'Browse the shop and find everyday favourites for every room.',
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Buttons',
      fields: [
        linkGroup({
          appearances: ['default', 'outline'],
          overrides: {
            maxRows: 2,
          },
        }),
      ],
    },
  ],
}
