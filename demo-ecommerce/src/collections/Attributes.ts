import { CollectionConfig } from "payload";

export const Attributes: CollectionConfig = {
  slug: 'attributes',

  access: {
    read: () => true,
  },

  labels: {
    singular: 'Attribut',
    plural: 'Attributs',
  },

  admin: {
    useAsTitle: 'name',
    group: 'Gestion de stock',
  },

  defaultPopulate: {
    name: true,
    values: true,
    label : true
  },

  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
    name: 'label',
    type: 'text',
    localized: true,
    required: true,
  },
    {
      name: 'values',
      type: 'join',
      collection: 'attributeValues',
      on: 'attribute',
    },
  ],
}