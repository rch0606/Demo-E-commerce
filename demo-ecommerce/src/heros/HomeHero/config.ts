import { colorSelect } from '@/fields/colorSelect'
import { iconsSelect } from '@/fields/iconsSelect'
import { link } from '@/fields/link'
import type { Field } from 'payload'

export const HomeHero: Field = {
  name: 'homeHero',
  type: 'group',

  fields: [
    {
      type: 'collapsible',
      label: 'Content',
      fields: [
        {
          name: 'title',
          type: 'text',
          localized: true,
        },
        {
          name: 'description',
          type: 'textarea',
          localized: true,
        },
      ],
    },

    {
      type: 'collapsible',
      label: 'Images',
      fields: [
        {
          name: 'images',
          type: 'array',
          label: 'Hero Images',
          required: true,
          minRows: 1,
          maxRows: 5,
          fields: [
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              required: true,
            },
           
          ],
        },
      ],
    },

    {
      type: 'collapsible',
      label: 'CTA Button',
      fields: [
        {
          name: 'cta',
          label: 'CTA Button',
          type: 'group',
          fields: [
            link({ appearances: false }),
          ],
        },
      ],
    },

    {
      type: 'collapsible',
      label: 'Trust Items',
      fields: [
        {
          name: 'trustItems',
          type: 'array',
          maxRows: 3,
          fields: [
            iconsSelect({
              name: 'icon',
              required: true,
            }),
            colorSelect({
              name: 'color',
              required: false,
            }),
            {
              name: 'label',
              type: 'text',
              required: true,
              localized: true,
            },
          ],
        },
      ],
    },
  ],
}