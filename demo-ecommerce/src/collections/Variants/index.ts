import { CollectionConfig } from 'payload'
import { generateSKUHooks } from './hooks/generateSKU'
import {
  syncProductStockFromVariants,
  syncProductStockAfterVariantDelete,
} from './hooks/syncProductStock'

export const Variants: CollectionConfig = {
  slug: 'variants',
  labels: {
    singular: 'Variant',
    plural: 'Variants',
  },
  // Lecture publique requise pour le storefront (Quick Add, ProductCard, page produit)
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  admin: {
    useAsTitle: 'sku',
    group: 'Gestion de stock',
    defaultColumns: ['sku', 'product', 'combination', 'price', 'stock'],
    listSearchableFields: ['sku'],
  },
  fields: [
    {
      name: 'sku',
      type: 'text',
      label: 'Variant SKU',
      unique: true,
      index: true,
    },
    {
      // Référence réelle de la taille (étiquette, code-barres fournisseur),
      // saisie à la main. Le SKU ci-dessus reste l'identifiant interne généré.
      name: 'reference',
      label: 'Référence',
      type: 'text',
      // Pas de `unique: true` : l'index unique (sparse) de MongoDB compte les
      // `null`, si bien qu'un seul variant de toute la base pouvait rester sans
      // référence. L'unicité est vérifiée dans `validate`, en ignorant les vides.
      index: true,
      admin: {
        // Non utilisé pour l'instant : masqué dans l'admin, les valeurs
        // existantes restent en base. Retirer `hidden` pour le réafficher.
        hidden: true,
        description: 'Code-barres ou référence fournisseur de cette taille (facultatif, unique).',
      },
      hooks: {
        beforeValidate: [({ value }) => (typeof value === 'string' ? value.replace(/\s+/g, '') || null : value)],
      },
      validate: async (value: string | null | undefined, { req, id }: any) => {
        if (!value) return true

        if (!/^[0-9A-Za-z-]+$/.test(value)) {
          return 'La référence contient des caractères invalides (lettres, chiffres et tirets uniquement).'
        }

        if (value.length < 8 || value.length > 32) {
          return 'La référence doit contenir entre 8 et 32 caractères.'
        }

        const { docs } = await req.payload.find({
          collection: 'variants',
          where: id
            ? { and: [{ reference: { equals: value } }, { id: { not_equals: id } }] }
            : { reference: { equals: value } },
          depth: 0,
          limit: 1,
          overrideAccess: true,
          req,
          select: { sku: true },
        })

        if (docs.length) {
          return `Cette référence est déjà utilisée par le variant ${docs[0].sku}.`
        }

        return true
      },
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      maxDepth: 3,
      required: true,
    },
    {
      name: 'attributes',
      type: 'relationship',
      relationTo: 'attributes',
      hasMany: true,
      required: true,
      admin: {
        description: 'Select the attributes for this variant',
      },
    },
    {
      name: 'combination',
      label: 'Attribute Values',
      type: 'relationship',
      relationTo: 'attributeValues',
      hasMany: true,
      required: true,
      admin: {
        description: 'Select the attribute values for this variant',
      },
      filterOptions: async ({ data, req }) => {
        if (!data?.attributes || data.attributes.length === 0) {
          return {
            id: {
              equals: null,
            },
          }
        }

        try {
          const attributeValues = await req.payload.find({
            collection: 'attributeValues',
            where: {
              'attribute.id': {
                in: data.attributes,
              },
            },
            overrideAccess: true,
            limit: 100,
          })

          const valueIds = attributeValues.docs.map((doc: any) => doc.id)

          if (valueIds.length === 0) {
            return {
              id: {
                equals: null,
              },
            }
          }
          return {
            id: {
              in: valueIds,
            },
          }
        } catch (error) {
          console.error('Error filtering combination options:', error)
          return {
            id: {
              equals: null,
            },
          }
        }
      },
    },
    {
      name: 'price',
      type: 'number',
    },
    {
    name: 'oldPrice',
    type: 'number',
    admin: {
      description: 'Previous price displayed as discount price',
    },
  },
    {
      name: 'stock',
      type: 'number',
    },
    {
      name: 'images',
      label: 'Variant Images',
      type: 'array',
      required: false,
      admin: {
        description: 'Upload multiple images for this specific variant',
      },
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
  hooks: {
    beforeChange: [generateSKUHooks],
    afterChange: [syncProductStockFromVariants],
    afterDelete: [syncProductStockAfterVariantDelete],
  },
}
