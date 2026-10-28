import { link } from '@/fields/link'
import type { Block } from 'payload'

export const HomeProducts: Block = {
  slug: 'homeProducts',
  interfaceName: 'HomeProductsType',
  imageURL : '/blocks/homeproducts.png',
  labels: {
    singular: 'Home Products',
    plural: 'Home Products',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      required: true,
      defaultValue: 'All Products',
      localized: true,
    },
    {
      type: 'collapsible',
      label: 'All Products Link',
      fields: [
        {
          name: 'cta',
          type: 'group',
          label: 'View All Button',
          fields: [
            link({ appearances: false }),
          ],
        },
      ],
    },
  ],
}