'use client'

import { useEffect, useMemo, useState } from 'react'
import { ShoppingBag, Minus, Plus, Check } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'
import type { Product } from '@/payload-types'
import { useCartStore } from '@/stores/cart'
import { useProductVariants } from '@/hooks/useProductVariants'
import { trackAddToCart } from '@/lib/metaPixel'
import { trackAddToCart as trackAnalyticsAddToCart } from '@/lib/analytics'

import { CMSLink } from '../Link'
import { cn } from '@/lib/utils'
import { Media } from '@/components/Media'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function formatPrice(value: number | null | undefined, currency = 'DT') {
  if (value == null || isNaN(Number(value))) {
    return `0 ${currency}`
  }

  return `${Number(value).toLocaleString('fr-FR')} ${currency}`
}

function getText(
  value: string | Record<string, string> | undefined | null,
  locale: string,
): string {
  if (!value) return ''

  if (typeof value === 'string') return value

  return (
    value[locale] ||
    value.fr ||
    value.en ||
    Object.values(value)[0] ||
    ''
  )
}

function getImageUrl(image: any): string {
  if (!image) return '/placeholder.svg'

  if (typeof image === 'string') return image

  return image.url || image.sizes?.thumbnail?.url || '/placeholder.svg'
}

const DIALOG_COPY = {
  fr: { addTitle: 'Ajouter au panier', editTitle: 'Modifier le produit', quantity: 'Quantité', decrease: 'Diminuer la quantité', increase: 'Augmenter la quantité', soldOut: 'Épuisé', add: 'Ajouter au panier', save: 'Enregistrer', added: 'Ajouté', saved: 'Modifié', viewProduct: 'Voir le produit' },
  en: { addTitle: 'Add to cart', editTitle: 'Edit product', quantity: 'Quantity', decrease: 'Decrease quantity', increase: 'Increase quantity', soldOut: 'Sold out', add: 'Add to cart', save: 'Save', added: 'Added', saved: 'Updated', viewProduct: 'View product' },
  ar: { addTitle: 'أضف إلى السلة', editTitle: 'تعديل المنتج', quantity: 'الكمية', decrease: 'إنقاص الكمية', increase: 'زيادة الكمية', soldOut: 'نفد المخزون', add: 'أضف إلى السلة', save: 'حفظ', added: 'تمت الإضافة', saved: 'تم التعديل', viewProduct: 'عرض المنتج' },
} as const

interface ProductQuickAddDialogProps {
  productId: string | number | undefined
  /** Full product with productAttributes + variants.docs — required for options */
  initialProduct?: Product | null
  initialVariant?: any | null
  preview?: {
    title?: string
    image?: string
    slug?: string
    currentPrice?: number
    oldPrice?: number
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  locale: string
  /** When set, dialog updates this cart line instead of adding a new one */
  editCartItemId?: string | null
  initialQuantity?: number
}

export function ProductQuickAddDialog({
  productId,
  initialProduct,
  initialVariant,
  preview,
  open,
  onOpenChange,
  locale,
  editCartItemId = null,
  initialQuantity = 1,
}: ProductQuickAddDialogProps) {
  const { t } = useLocale()
  const { addItem, updateItem } = useCartStore()

  const isEditMode = !!editCartItemId

  const [isAdding, setIsAdding] = useState(false)

  /**
   * Product must come from the parent (ProductCard, favoris cache, order page).
   * No client-side fetch — attributes are available immediately.
   */
  const effectiveProduct = initialProduct || null
  const effectiveInitialVariant = initialVariant || null

  /**
   * Quantity starts from the value passed by the parent.
   * Parent should use a `key` to remount when editing another item / reopening.
   */
  const [quantity, setQuantity] = useState(
    Math.max(1, initialQuantity || 1),
  )

  const {
    attributes,
    selectedValues,
    selectedVariant,
    currentPrice,
    currentOldPrice,
    currentStock,
    allAttributesSelected,
    selectValue,
    getValues,
    getAttributeId,
    getAttributeName,
    getValueId,
    getValueName,
    getSelectedAttributesForCart,
  } = useProductVariants({
    product: effectiveProduct || ({} as Product),
    initialVariant: effectiveInitialVariant,
    onColorSelect: () => {},
  })

  // Même règle que la page produit : la quantité suit le stock de la taille choisie.
  useEffect(() => {
    const stock = Number(currentStock) || 0
    if (stock > 0) setQuantity((q) => Math.min(q, stock))
  }, [currentStock])

  const productReady =
    !!effectiveProduct &&
    Array.isArray((effectiveProduct as any)?.variants?.docs)

  const isOutOfStock =
    productReady &&
    (attributes.length > 0
      ? !!selectedVariant && Number(selectedVariant.stock) <= 0
      : Number(currentStock) <= 0)

  const canPurchase =
    !!effectiveProduct &&
    productReady &&
    (attributes.length === 0 ||
      (allAttributesSelected && !!selectedVariant)) &&
    Number(currentStock) > 0

  const title =
    (effectiveProduct &&
      getText(effectiveProduct.productTitle as any, locale)) ||
    preview?.title ||
    ''

  const slug =
    (effectiveProduct &&
      getText(effectiveProduct.slug as any, locale)) ||
    preview?.slug ||
    ''

  const imageUrl = useMemo(() => {
    if (effectiveProduct?.featuredImage) {
      return getImageUrl(effectiveProduct.featuredImage)
    }

    if (effectiveProduct?.gallery?.[0]?.image) {
      return getImageUrl(effectiveProduct.gallery[0].image)
    }

    return preview?.image || '/placeholder.svg'
  }, [effectiveProduct, preview?.image])

  const displayPrice = productReady
    ? currentPrice
    : (preview?.currentPrice ?? 0)

  const displayOldPrice = productReady
    ? currentOldPrice
    : (preview?.oldPrice ?? null)

  const handleAddToCart = () => {
    if (!effectiveProduct || !canPurchase || isAdding) {
      return
    }

    setIsAdding(true)

    const payload = {
      productId: String(effectiveProduct.id),

      variantId: selectedVariant?.id
        ? String(selectedVariant.id)
        : null,

      slug: String(slug || effectiveProduct.id),

      title: String(title || effectiveProduct.id),

      image:
        imageUrl && imageUrl !== '/placeholder.svg'
          ? imageUrl
          : undefined,

      quantity,

      price: Number(currentPrice) || 0,

      oldPrice:
        currentOldPrice != null ? Number(currentOldPrice) : undefined,

      stock: currentStock,

      selectedAttributes: getSelectedAttributesForCart() || [],
    }

    try {
      if (isEditMode && editCartItemId) {
        updateItem(editCartItemId, {
          variantId: payload.variantId,
          quantity: payload.quantity,
          price: payload.price,
          oldPrice: payload.oldPrice,
          selectedAttributes: payload.selectedAttributes,
          title: payload.title,
          image: payload.image,
          stock: payload.stock,
        })
      } else {
        addItem(payload, false)

        // Meta Pixel — content_ids must match catalogue feed <g:id> (product.id)
        trackAddToCart({
          contentIds: payload.productId,
          value: payload.price * payload.quantity,
          currency: 'TND',
          contents: [
            {
              id: payload.productId,
              quantity: payload.quantity,
              item_price: payload.price,
            },
          ],
        })

        trackAnalyticsAddToCart({
          productId: payload.productId,
          value: payload.price * payload.quantity,
          quantity: payload.quantity,
          name: payload.title,
        })

        window.dispatchEvent(new CustomEvent('open-cart-dropdown'))

      }

      onOpenChange(false)
    } catch (err) {
      console.error('addItem/updateItem error:', err)
    } finally {
      setTimeout(() => {
        setIsAdding(false)
      }, 400)
    }
  }

  const copy = DIALOG_COPY[(locale in DIALOG_COPY ? locale : 'fr') as keyof typeof DIALOG_COPY]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'w-[calc(100vw-1rem)] max-w-lg overflow-hidden rounded-3xl bg-card p-0 ring-0 shadow-[0_8px_30px_rgba(38,35,43,0.06)]',
          'sm:w-[calc(100vw-2rem)] sm:max-w-3xl',
        )}
        showCloseButton
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            {title || (isEditMode ? copy.editTitle : copy.addTitle)}
          </DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[90vh] min-h-0 flex-col sm:grid sm:h-[480px] sm:max-h-none sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          {/* IMAGE — tuile beige */}
          <div className="shrink-0 p-3 pb-0 sm:h-full sm:p-3">
            <div className="relative h-[220px] w-full overflow-hidden rounded-2xl bg-brand-mist sm:h-full">
              <Media
                src={(imageUrl || '/placeholder.svg') as any}
                alt={title || 'Produit'}
                fill
                htmlElement={null}
                imgClassName="object-cover"
                size="(max-width: 640px) 100vw, 340px"
              />
            </div>
          </div>

          {/* CONTENU */}
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 sm:h-full sm:p-7 sm:pe-8">
            {/* TITRE + PRIX */}
            <div className="pe-8">
              <h2 className="line-clamp-2 font-heading text-xl font-normal leading-snug text-foreground sm:text-2xl">
                {title || 'Produit'}
              </h2>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-base font-medium text-foreground">
                  {formatPrice(displayPrice, t.currency || 'DT')}
                </span>

                {displayOldPrice != null &&
                  Number(displayOldPrice) > Number(displayPrice) && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(Number(displayOldPrice), t.currency || 'DT')}
                    </span>
                  )}
              </div>
            </div>

            {/* ATTRIBUTS — rendus immédiatement depuis initialProduct */}
            {attributes.length > 0 && (
              <div className="space-y-4 border-t border-border pt-5">
                {attributes.map((attribute: any) => {
                  const attributeId = String(getAttributeId(attribute))
                  const attributeName = getAttributeName(attribute)
                  const values = getValues(attributeId)

                  if (!values.length) {
                    return null
                  }

                  const selectedName = values
                    .filter((value: any) => selectedValues[attributeId] === String(getValueId(value) || ''))
                    .map((value: any) => getValueName(value))[0]

                  return (
                    <div key={attributeId}>
                      <p className="mb-2 text-[13px] text-muted-foreground">
                        {attributeName}
                        {selectedName && (
                          <span className="ms-1.5 text-foreground">: {selectedName}</span>
                        )}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {values.map((value: any) => {
                          const valueId = String(getValueId(value) || '')
                          const valueName = getValueName(value)
                          const isSelected = selectedValues[attributeId] === valueId

                          return (
                            <button
                              key={valueId || valueName}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => selectValue(attributeId, valueId)}
                              className={cn(
                                'min-w-11 rounded-full border px-4 py-2 text-sm transition-colors',
                                isSelected
                                  ? 'border-foreground bg-foreground text-background'
                                  : 'border-foreground/15 bg-transparent text-foreground hover:border-foreground/40',
                              )}
                            >
                              {valueName}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* QUANTITÉ */}
            <div>
              <p className="mb-2 text-[13px] text-muted-foreground">{t.quantity || copy.quantity}</p>
              <div className="inline-flex items-center rounded-full border border-foreground/15">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label={copy.decrease}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>

                <span className="w-8 text-center text-sm tabular-nums">{quantity}</span>

                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  disabled={
                    productReady &&
                    Number(currentStock) > 0 &&
                    quantity >= Number(currentStock)
                  }
                  aria-label={copy.increase}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {isOutOfStock && (
              <span className="inline-flex w-fit items-center rounded-full bg-brand-blush px-3 py-1 text-xs text-destructive">
                {copy.soldOut}
              </span>
            )}

            {/* ACTIONS */}
            <div className="mt-auto flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!canPurchase || isAdding}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAdding ? (
                  <>
                    <Check className="h-4 w-4" strokeWidth={1.5} />
                    {isEditMode ? copy.saved : copy.added}
                  </>
                ) : isOutOfStock ? (
                  copy.soldOut
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
                    {isEditMode ? copy.save : copy.add}
                  </>
                )}
              </button>

              {slug && (
                <CMSLink
                  url={`/produit/${slug}`}
                  onClick={() => onOpenChange(false)}
                  className="text-center text-sm text-foreground underline underline-offset-4 transition-colors hover:text-brand-pink"
                >
                  {t.viewProduct || copy.viewProduct}
                </CMSLink>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
