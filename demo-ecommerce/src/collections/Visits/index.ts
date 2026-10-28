import type { CollectionConfig } from 'payload'
import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'

/**
 * Visits — analytics tracker for the storefront.
 * One document ≈ one visitor session (cookie `_tid`).
 * Created / updated by the public tracker script via API routes.
 */
export const Visits: CollectionConfig = {
  slug: 'visits',
  labels: {
    singular: 'Visite',
    plural: 'Visites',
  },
  admin: {
    // Human title — not the UUID (see displayTitle + beforeChange)
    useAsTitle: 'displayTitle',
    defaultColumns: [
      'displayTitle',
      'source',
      'firstPage',
      'location.city',
      'pageViews',
      'startedAt',
    ],
    listSearchableFields: [
      'displayTitle',
      'visitId',
      'ip',
      'utmSource',
      'utmCampaign',
      'fbclid',
      'gclid',
      'firstPage',
    ],

    // Same pattern as Chiffre d'affaires — custom sidebar link only
    group: false,
    description: 'Sessions visiteurs (source, pages, géolocalisation).',
    hidden: ({ user }) => user?.role !== 'owner' && user?.role !== 'admin',
    components: {
      beforeList: [
        {
          path: '@/components/AdminManagement/visitsManagement/VisitsList',
        },
      ],
      views: {
        edit: {
          default: {
            Component: '@/components/AdminManagement/visitsManagement/VisitEdit',
          },
        },
      },
    },
  },
  access: {
    // Public tracker APIs use overrideAccess: true
    create: anyone,
    update: anyone,
    read: ({ req }) =>
      req.user?.role === 'owner' || req.user?.role === 'admin',
    delete: ({ req }) =>
      req.user?.role === 'owner' || req.user?.role === 'admin',
  },
  timestamps: true,
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (!data) return data
        const sourceMap: Record<string, string> = {
          organic: 'SEO',
          ads: 'Ads',
          social: 'Social',
          referral: 'Referral',
          direct: 'Site',
        }
        // Title = source only (Site / Ads / SEO…)
        data.displayTitle = sourceMap[String(data.source || '')] || 'Visite'
        return data
      },
    ],
  },
  fields: [
    {
      name: 'displayTitle',
      label: 'Titre',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'Titre lisible (source · ville · page) — pas l’UUID',
        position: 'sidebar',
      },
    },
    // ── Sidebar: quick summary ──────────────────────────────────────────────
    {
      name: 'source',
      label: 'Source',
      type: 'select',
      defaultValue: 'organic',
      options: [
        { label: 'Organic (SEO)', value: 'organic' },
        { label: 'Ads (payant)', value: 'ads' },
        { label: 'Social', value: 'social' },
        { label: 'Referral', value: 'referral' },
        { label: 'Site', value: 'direct' },


      ],
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'pageViews',
      label: 'Pages vues',
      type: 'number',
      defaultValue: 1,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'startedAt',
      label: 'Début de session',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        readOnly: true,
        position: 'sidebar',
      },
      index: true,
    },
    {
      name: 'lastSeenAt',
      label: 'Dernière activité',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'host',
      label: 'Site (host)',
      type: 'text',
      index: true,
      admin: { position: 'sidebar', readOnly: true },
    },

    // ── Main area with tabs ─────────────────────────────────────────────────
    {
      type: 'tabs',
      tabs: [
        // ── Tab 1: Visitor ──────────────────────────────────────────────────
        {
          label: 'Visiteur',
          fields: [
            {
              name: 'visitId',
              label: 'ID de session',
              type: 'text',
              required: true,
              unique: true,
              index: true,
              admin: {
                readOnly: true,
                description:
                  'ID de session (nouvelle session après ~30 min d’inactivité). Compte 1 visite dans les stats jour/semaine/mois.',
              },
            },
            {
              name: 'visitorId',
              label: 'ID visiteur',
              type: 'text',
              index: true,
              admin: {
                readOnly: true,
                description:
                  'Cookie long `_vid` (~1 an). Même personne = même visitorId sur plusieurs sessions.',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'ip',
                  label: 'Adresse IP',
                  type: 'text',
                  admin: { readOnly: true, width: '50%' },
                },
                {
                  name: 'firstPage',
                  label: 'Première page',
                  type: 'text',
                  admin: { readOnly: true, width: '50%' },
                },
              ],
            },
            {
              name: 'referrer',
              label: 'Page d’origine (Referrer)',
              type: 'text',
              admin: {
                readOnly: true,
                description:
                  'URL de la page d’où le visiteur est arrivé (ex: google.com, facebook.com). Vide = accès direct (tape l’URL ou favori).',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'browser',
                  label: 'Navigateur',
                  type: 'text',
                  admin: { readOnly: true, width: '33%' },
                },
                {
                  name: 'browserVersion',
                  label: 'Version',
                  type: 'text',
                  admin: { readOnly: true, width: '33%' },
                },
                {
                  name: 'deviceType',
                  label: 'Type appareil',
                  type: 'select',
                  options: [
                    { label: 'Desktop', value: 'desktop' },
                    { label: 'Mobile', value: 'mobile' },
                    { label: 'Tablette', value: 'tablet' },
                    { label: 'Inconnu', value: 'unknown' },
                  ],
                  admin: { readOnly: true, width: '34%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'os',
                  label: 'Système',
                  type: 'text',
                  admin: { readOnly: true, width: '33%' },
                },
                {
                  name: 'osVersion',
                  label: 'Version OS',
                  type: 'text',
                  admin: { readOnly: true, width: '33%' },
                },
                {
                  name: 'device',
                  label: 'Appareil',
                  type: 'text',
                  admin: {
                    readOnly: true,
                    width: '34%',
                    description: 'Modèle si connu (ex: iPhone)',
                  },
                },
              ],
            },
            // {
            //   name: 'userAgent',
            //   label: 'User-Agent (brut)',
            //   type: 'textarea',
            //   admin: {
            //     readOnly: true,
            //     description: 'Chaîne originale — utile pour le debug',
            //     rows: 2,
            //   },
            // },
            {
              name: 'location',
              label: 'Localisation (via IP)',
              type: 'group',
              admin: {
                description:
                  'Estimée automatiquement à partir de l’IP (ipapi.co). Vide en local (127.0.0.1).',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'country',
                      label: 'Pays',
                      type: 'text',
                      index: true,
                      admin: { width: '50%', readOnly: true },
                    },
                    {
                      name: 'countryCode',
                      label: 'Code pays',
                      type: 'text',
                      admin: { width: '25%', readOnly: true },
                    },
                    {
                      name: 'city',
                      label: 'Ville',
                      type: 'text',
                      index: true,
                      admin: { width: '25%', readOnly: true },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'region',
                      label: 'Région',
                      type: 'text',
                      admin: { width: '50%', readOnly: true },
                    },
                    {
                      name: 'timezone',
                      label: 'Fuseau horaire',
                      type: 'text',
                      admin: { width: '50%', readOnly: true },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'latitude',
                      label: 'Latitude',
                      type: 'number',
                      admin: { width: '33%', readOnly: true },
                    },
                    {
                      name: 'longitude',
                      label: 'Longitude',
                      type: 'number',
                      admin: { width: '33%', readOnly: true },
                    },
                    {
                      name: 'org',
                      label: 'FAI / Opérateur',
                      type: 'text',
                      admin: { width: '34%', readOnly: true },
                    },
                  ],
                },
              ],
            },
          ],
        },

        // ── Tab 2: Attribution ──────────────────────────────────────────────
        {
          label: 'Attribution (Ads / UTM)',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'fbclid',
                  label: 'Facebook Click ID (fbclid)',
                  type: 'text',
                  index: true,
                  admin: { readOnly: true, width: '50%' },
                },
                {
                  name: 'gclid',
                  label: 'Google Click ID (gclid)',
                  type: 'text',
                  index: true,
                  admin: { readOnly: true, width: '50%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'msclkid',
                  label: 'Microsoft Click ID',
                  type: 'text',
                  index: true,
                  admin: { readOnly: true, width: '50%' },
                },
                {
                  name: 'ttclid',
                  label: 'TikTok Click ID',
                  type: 'text',
                  index: true,
                  admin: { readOnly: true, width: '50%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'utmSource',
                  label: 'UTM Source',
                  type: 'text',
                  index: true,
                  admin: {
                    readOnly: true,
                    width: '33%',
                    description: 'ex: facebook, google, newsletter',
                  },
                },
                {
                  name: 'utmMedium',
                  label: 'UTM Medium',
                  type: 'text',
                  admin: {
                    readOnly: true,
                    width: '33%',
                    description: 'ex: cpc, social, email',
                  },
                },
                {
                  name: 'utmCampaign',
                  label: 'UTM Campaign',
                  type: 'text',
                  admin: {
                    readOnly: true,
                    width: '34%',
                    description: 'Nom de la campagne',
                  },
                },
              ],
            },
          ],
        },

        // ── Tab 3: Journey ──────────────────────────────────────────────────
        {
          label: 'Parcours',
          fields: [
            {
              name: 'pages',
              label: 'Pages visitées',
              type: 'array',
              admin: {
                readOnly: true,
                description: 'Ordre chronologique des pages dans cette session',
                initCollapsed: false,
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'path',
                      label: 'Chemin',
                      type: 'text',
                      required: true,
                      admin: { width: '40%' },
                    },
                    {
                      name: 'title',
                      label: 'Titre',
                      type: 'text',
                      admin: { width: '35%' },
                    },
                    {
                      name: 'visitedAt',
                      label: 'Visité le',
                      type: 'date',
                      admin: {
                        width: '25%',
                        date: { pickerAppearance: 'dayAndTime' },
                      },
                    },
                  ],
                },
                {
                  name: 'room',
                  label: 'Room ID (enregistrement)',
                  type: 'text',
                  admin: {
                    description: 'Réservé pour le session replay (rrweb) — optionnel',
                    condition: () => false, // hide until recording is enabled
                  },
                },
              ],
            },
            {
              name: 'events',
              label: 'Événements',
              type: 'array',
              admin: {
                readOnly: true,
                description:
                  'Actions importantes (view_product, add_to_cart, purchase…). Envoyés via /api/analytics/event',
                initCollapsed: true,
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'type',
                      label: 'Type',
                      type: 'text',
                      required: true,
                      admin: {
                        width: '22%',
                        description: 'ex: view_product, add_to_cart, purchase',
                      },
                    },
                    {
                      name: 'path',
                      label: 'Page',
                      type: 'text',
                      admin: { width: '28%' },
                    },
                    {
                      name: 'roomId',
                      label: 'Room (replay)',
                      type: 'text',
                      admin: {
                        width: '25%',
                        description: 'Session rrweb au moment de l’événement',
                      },
                    },
                    {
                      name: 'at',
                      label: 'Date',
                      type: 'date',
                      admin: {
                        width: '25%',
                        date: { pickerAppearance: 'dayAndTime' },
                      },
                    },
                  ],
                },
                // ── Readable details (no JSON) ──────────────────────────────
                {
                  type: 'row',
                  fields: [
                    // {
                    //   name: 'productId',
                    //   label: 'ID Produit',
                    //   type: 'text',
                    //   admin: { width: '25%' },
                    // },
                    {
                      name: 'productName',
                      label: 'Nom produit',
                      type: 'text',
                      admin: { width: '35%' },
                    },
                    {
                      name: 'value',
                      label: 'Valeur (€)',
                      type: 'number',
                      admin: { width: '20%' },
                    },
                    {
                      name: 'quantity',
                      label: 'Qté',
                      type: 'number',
                      admin: { width: '20%' },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'orderId',
                      label: 'Commande ID',
                      type: 'text',
                      admin: { width: '33%' },
                    },
                    {
                      name: 'orderNumber',
                      label: 'N° commande',
                      type: 'text',
                      admin: { width: '33%' },
                    },
                    {
                      name: 'itemCount',
                      label: 'Nb articles',
                      type: 'number',
                      admin: { width: '34%' },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'promoCode',
                      label: 'Code promo',
                      type: 'text',
                      admin: { width: '50%' },
                    },
                    {
                      name: 'discountAmount',
                      label: 'Réduction (€)',
                      type: 'number',
                      admin: { width: '50%' },
                    },
                  ],
                },
              ],
            },
          ],
        },


        // ── Tab 4: Advanced (hidden technical) ──────────────────────────────
        {
          label: 'Avancé',
          fields: [
            {
              name: 'rooms',
              label: 'Rooms (session replay)',
              type: 'array',
              admin: {
                readOnly: true,
                description:
                  'IDs des sessions d’enregistrement écran (rrweb). Vide tant que le recording n’est pas activé.',
              },
              fields: [
                {
                  name: 'roomId',
                  label: 'Room ID',
                  type: 'text',
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
