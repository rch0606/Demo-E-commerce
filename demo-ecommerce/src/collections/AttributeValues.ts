import { CollectionConfig } from "payload";

export const AttributeValues: CollectionConfig = {
  slug: 'attributeValues',

  access: {
    read: () => true,
  },

  labels: {
    singular: 'Attribute Value',
    plural: 'Attribute Values',
  },

  admin: {
    useAsTitle: 'value',
    hidden: true,
    group: 'Gestion de stock',  
  },

  fields: [
    {
      name: 'attribute',
      type: 'relationship',
      relationTo: 'attributes',
      required: true,
    },
    {
      name: 'label',
      type: 'text',
      localized: true,
      required: true,
    },
    {
      name: 'value',
      type: 'text',
      required: true,
    },
  ],
}