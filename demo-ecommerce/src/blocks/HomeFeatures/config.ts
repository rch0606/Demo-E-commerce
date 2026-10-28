import { colorSelect } from '@/fields/colorSelect'
import { iconsSelect } from '@/fields/iconsSelect'
import type { Block } from 'payload'

export const HomeFeatures: Block = {
  slug: 'homeFeatures',
  interfaceName: 'HomeFeaturesType',
  imageURL : '/blocks/homefeatures.png',
  labels: {
    singular: 'Home Features',
    plural: 'Home Features',
  },
  fields: [
    {
      name: 'features',
      type: 'array',
      label: 'Features',
      required: true,
      minRows: 2,
      maxRows: 6,
      fields: [
        {
          type: 'row',
          fields: [
            iconsSelect({
              name: 'icon',
              required: true,
            }),
            colorSelect({
              name: 'color',
              required: false,
            }),
          ],
        },
        {
          name: 'title',
          type: 'text',
          label: 'Title',
          required: true,
          localized: true,
        },
        {
          name: 'description',
          type: 'text',
          label: 'Description',
          required: true,
          localized: true,
        },
      ],
    },
  ],
}