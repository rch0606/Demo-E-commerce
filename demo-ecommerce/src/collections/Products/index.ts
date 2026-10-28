import { authenticated } from "@/access/authenticated"
import { authenticatedOrPublished } from "@/access/authenticatedOrPublished"
import { generatePreviewPath } from "@/utilities/generatePreviewPath"
import { MetaDescriptionField, MetaImageField, MetaTitleField, OverviewField, PreviewField } from "@payloadcms/plugin-seo/fields"
import { slugField, type CollectionConfig } from "payload"
import { revalidateDelete, revalidateProduct } from "./hooks/revalidateProduct"
import { applyCategoryPromo } from "./hooks/applyCategoryPromo"
import { deriveTotalStock } from "./hooks/deriveTotalStock"
import { deriveReviewStats } from "./hooks/deriveReviewStats"
import { deleteProductVariants } from "./hooks/deleteProductVariants"
import { deleteFromGoogleMerchant, merchantSyncEndpoint, syncGoogleMerchant } from "./hooks/syncGoogleMerchant"

export const Products: CollectionConfig = {
  slug: 'products',
  labels: {
    singular: 'Produit',
    plural: 'Produits',
  },
  admin: {
    useAsTitle: 'productTitle',
    // La barre de recherche de la liste cherche aussi dans la référence.
    listSearchableFields: ['productTitle', 'barcode'],
    defaultColumns: ['productTitle', 'barcode', 'currentPrice', 'totalStock', 'categories', 'createdAt'],
    group: 'Gestion de stock',
    components: {
      beforeList: [
        {
          path: '@/components/AdminManagement/productManagement/ProductStatistics',
        },
      ],
    },
    livePreview: {
      url: ({ data, locale }) => {
        const localeObj = locale as any
        const lang = typeof localeObj === 'string' 
          ? localeObj 
          : (localeObj?.code || 'fr')
        
        return generatePreviewPath({
          slug: data?.slug,
          collection: 'products',
          lang,
        })
      },
    },
    preview: (data, { locale }) => {
      const localeObj = locale as any
      const lang = typeof localeObj === 'string' 
        ? localeObj 
        : (localeObj?.code || 'fr')
      
      return generatePreviewPath({
        slug: String(data?.slug || ''),
        collection: 'products',
        lang,
      })
    },
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  fields: [
    {
      name: 'productTitle',
      label: 'Product Title',
      type: 'text',
      required: true,
      localized: true,
      admin: {
        description: 'The main product title displayed on the page',
      },
    },
    {
      name: 'subtitle',
      label: 'Product Subtitle',
      type: 'text',
      localized: true,
      admin: {
        description: 'Short line displayed under the product title',
      },
    },
    {
      name: 'description',
      label: 'Product Description',
      type: 'textarea',
      required: true,
      localized: true,
      admin: {
        description: 'Detailed product description',
      },
    },

    {
      type: 'tabs',
      tabs: [
        {
          label: 'Gallery',
          fields: [
            {
              type: 'collapsible',
              label: 'Featured Image',
              fields: [
                {
                  name: 'featuredImage',
                  type: 'upload',
                  relationTo: 'media',
                  label: 'Featured Image',
                },
                {
                  name: 'featuredImageColor',
                  type: 'relationship',
                  relationTo: 'attributeValues',
                  required: false,
                  filterOptions: {
                    'attribute.name': {
                      in: ['Color', 'Couleur', 'color', 'couleur'],
                    },
                  },
                },
              ]
            },
            {
              name: 'gallery',
              label: 'Product Gallery',
              type: 'array',
              minRows: 1,
              maxRows: 10,
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                },
                {
                  name: 'color',
                  type: 'relationship',
                  relationTo: 'attributeValues', 
                  admin: {
                    description: 'Select the color for this gallery image',
                  },
                  filterOptions: {
                    'attribute.name': {
                      in: ['Color', 'Couleur', 'color', 'couleur'],
                    }
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Pricing & Attributes',
          fields: [
            {
              type: 'collapsible',
              label: 'Pricing',
              fields: [
                {
                  name: 'currentPrice',
                  type: 'number',
                  label: 'Current Price',
                  required: true,
                  admin: {
                    description: 'Default price used when generating variants',
                  },
                },
                {
                  name: 'oldPrice',
                  type: 'number',
                  label: 'Old Price',
                  admin: {
                    description: 'Original price for comparison (used as default for variants)',
                  },
                  validate: (
                    value: number | null | undefined,
                    { data }: { data: { currentPrice?: number } }
                  ): true | string => {
                    if (
                      typeof value === 'number' &&
                      typeof data?.currentPrice === 'number' &&
                      value <= data.currentPrice
                    ) {
                      return 'Old price must be greater than current price'
                    }
                    return true
                  },
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'Attributes',
              fields: [
                {
                  name: 'productAttributes',
                  label: 'Product Attributes',
                  type: 'array',
                  fields: [
                    {
                      name: 'attribute',
                      label: 'Attribute',
                      type: 'relationship',
                      relationTo: 'attributes',
                      required: true,
                    },
                    {
                      name: 'values',
                      label: 'Values',
                      type: 'relationship',
                      relationTo: 'attributeValues',
                      hasMany: true,
                      required: true,
                      filterOptions: ({ siblingData }: { siblingData: any }) => {
                        if (!siblingData?.attribute) return true

                        return {
                          'attribute.id': {
                            equals: siblingData.attribute,
                          },
                        }
                      },
                    },
                  ],
                },
                {
                  type: 'collapsible',
                  label: 'Product Variants',
                  fields: [
                    {
                    name: 'generateVariants',
                    type: 'ui',
                    admin: {
                     condition: (data) =>
                        Array.isArray(data?.productAttributes) &&
                        data.productAttributes.some(
                          (item: any) =>
                            item?.attribute &&
                            Array.isArray(item?.values) &&
                            item.values.length > 0
                        ),
                      components: {
                        Field: {
                          path: '@/fields/generateVariantsButton/GenerateVariantsButton#GenerateVariantsButton',
                        },
                      },
                    },
                  },
                    {
                      name: 'variants',
                      type: 'join',
                      collection: 'variants',
                      on: 'product',
                      defaultLimit: 100,
                      admin: {
                        defaultColumns: ['sku', 'combination', 'price', 'stock'],
                        description: 'Manage product variants. Each variant has its own price and stock. Generate variants using the button above.',
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'Additional Information',
              admin: {
                initCollapsed: true,
              },
              fields: [
                {
                  name: 'additionalInfoTitle',
                  type: 'text',
                  label: 'Title',
                  localized: true,
                  admin: {
                    description: 'Title for the additional information section',
                  },
                },
                {
                  name: 'specifications',
                  type: 'array',
                  label: 'Specifications',
                  localized: true,
                  admin: {
                    description: 'Add product specifications (e.g., Material, Dimensions, Weight)',
                  },
                  fields: [
                    {
                      name: 'label',
                      type: 'text',
                      required: true,
                      localized: true,
                      admin: { 
                        width: '50%',
                        description: 'Specification name (e.g., "Material")',
                      },
                    },
                    {
                      name: 'value',
                      type: 'text',
                      required: true,
                      localized: true,
                      admin: { 
                        width: '50%',
                        description: 'Specification value (e.g., "Cotton")',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Traçabilité',
          fields: [
            {
              name: 'stockStatus',
              type: 'ui',
              admin: {
                components: {
                  Field: {
                    path: '@/components/AdminManagement/StockStatus'
                  }
                }
              }
            },
            {
              name: 'stockMovements',
              type: 'ui',
              admin: {
                components: {
                  Field: {
                    path: '@/components/AdminManagement/stockMovementHistory'
                  }
                }
              }
            },
          ],
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'media',
            }),
            MetaDescriptionField({}),
            PreviewField({
              hasGenerateFn: true,
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      defaultValue: ({ user }) => user?.id ?? null,
      admin: { position: 'sidebar' },
    },
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
      defaultValue: new Date().toISOString(),
      admin: { position: 'sidebar', readOnly: true },
    },
        {
      name: 'barcode',
      label: 'Référence',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description: 'Référence du produit ',
        position: 'sidebar',
      },
      validate: (value: string | null | undefined) => {
        if (!value) return true

        // Remove spaces before validation
        const barcode = value.replace(/\s+/g, '')

        // Accept common barcode lengths
        if (!/^[0-9A-Za-z-]+$/.test(barcode)) {
          return 'Le code-barres contient des caractères invalides.'
        }

        if (barcode.length < 8 || barcode.length > 32) {
          return 'Le code-barres doit contenir entre 8 et 32 caractères.'
        }

        return true
      },
    },
    {
      name: 'badge',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
      label: 'Tags',
      admin: { position: 'sidebar' },
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      hasMany: true,
      label: 'Categories',
      admin: { position: 'sidebar' },
    },
    {
      // Renseigné en lecture par le hook applyCategoryPromo, jamais stocké.
      name: 'categoryPromoPercentage',
      type: 'number',
      virtual: true,
      label: 'Réduction catégorie (%)',
      admin: { hidden: true, readOnly: true },
    },
    {
      name: 'totalStock',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: {
        // Recalculé par `deriveTotalStock` à chaque écriture dès qu'il existe
        // au moins un variant. En lecture seule pour que le formulaire ne
        // laisse plus croire qu'on peut le corriger à la main.
        description:
          'Somme du stock des variants, recalculée automatiquement. Modifiez le stock sur chaque variant.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      // Calculés depuis la collection « Avis » (avis approuvés uniquement).
      name: 'averageRating',
      type: 'number',
      defaultValue: 0,
      label: 'Note moyenne',
      admin: {
        description: 'Moyenne des avis approuvés, recalculée automatiquement.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'reviewCount',
      type: 'number',
      defaultValue: 0,
      label: "Nombre d'avis",
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'relatedProducts',
      label: 'Related Products',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      admin: {
        position: 'sidebar',
        description: 'Select products to show as related on this product page',
      },
      filterOptions: ({ data }) => {
        return {
          id: {
            not_equals: data?.id
          }
        }
      },
    },
    slugField({
      useAsSlug: 'productTitle',
      position: 'sidebar',
    }),
  ],
  endpoints: [merchantSyncEndpoint],
  hooks: {
    beforeChange: [deriveTotalStock, deriveReviewStats],
    afterChange: [revalidateProduct, syncGoogleMerchant],
    afterDelete: [revalidateDelete, deleteProductVariants, deleteFromGoogleMerchant],
    afterRead: [applyCategoryPromo],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 100,
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
  timestamps: true,
}

export default Products