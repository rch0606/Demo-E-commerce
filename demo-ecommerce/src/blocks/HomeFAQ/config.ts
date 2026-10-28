import { iconsSelect } from '@/fields/iconsSelect'
import type { Block } from 'payload'

export const HomeFAQ: Block = {
  slug: 'homeFAQ',
  interfaceName: 'HomeFAQType',
  imageURL: '/blocks/homefaq.png',
  labels: {
    singular: 'Home FAQ',
    plural: 'Home FAQ',
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
          defaultValue: 'FAQ',
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
          defaultValue: 'Frequently Asked Questions',
        },
        {
          name: 'subtitle',
          type: 'textarea',
          label: 'Section Subtitle',
          localized: true,
          defaultValue: 'Everything you need to know about our products and services',
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Questions',
      fields: [
        {
          name: 'items',
          type: 'array',
          label: 'FAQ Items',
          required: true,
          minRows: 2,
          maxRows: 12,
          labels: {
            singular: 'Question',
            plural: 'Questions',
          },
          fields: [
            {
              name: 'question',
              type: 'text',
              label: 'Question',
              required: true,
              localized: true,
            },
            {
              name: 'answer',
              type: 'textarea',
              label: 'Answer',
              required: true,
              localized: true,
            },
          ],
        },
      ],
    },
  ],
}
