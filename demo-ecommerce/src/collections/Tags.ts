import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { colorSelect } from '@/fields/colorSelect'
import { CollectionConfig } from 'payload'

export const Tags: CollectionConfig = {
  slug: 'tags',
  labels: {
    singular: 'Tag',
    plural: 'Tags',
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'name',
    group: 'Gestion de stock',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
    },
    colorSelect({
      name: 'color',
      label: 'Badge Color',
      required: false,
    }),
  ],
}