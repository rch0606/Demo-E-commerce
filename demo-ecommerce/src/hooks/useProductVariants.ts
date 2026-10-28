'use client'

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useLocale } from '@/lib/locale-context'
import type { Product } from '@/payload-types'
import { getProductPromoPercentage, getPromoPricing } from '@/lib/categoryPromo'

interface Props {
  product: Product
  initialVariant?: any | null
  onVariantChange?: (variant: any | null) => void
  onColorSelect?: (color: string | null) => void
}

function isColor(name?: string) {
  const lower = name?.toLowerCase() || ''
  return lower.includes('color') || lower.includes('couleur')
}

export function useProductVariants({
  product,
  initialVariant = null,
  onVariantChange,
  onColorSelect,
}: Props) {
  const { t } = useLocale()

  /**
   * Only stores changes made by the user.
   *
   * The initial selection is derived from initialVariant so it is
   * available immediately on the first render.
   */
  const [userSelectedValues, setUserSelectedValues] = useState<
    Record<string, string>
  >({})

  const lastVariantId = useRef<string | null>(null)

  const variants = useMemo(() => {
    const docs = (product.variants as any)?.docs ?? []
    return Array.isArray(docs) ? docs : []
  }, [product.variants])

  const attributes = useMemo(() => {
    return (product.productAttributes ?? [])
      .map((row: any) => row?.attribute)
      .filter(Boolean)
  }, [product.productAttributes])

  const getAttributeId = useCallback((a: any): string => {
    if (a == null) return ''

    if (typeof a === 'string' || typeof a === 'number') {
      return String(a)
    }

    return a.id != null ? String(a.id) : ''
  }, [])

  const getAttributeName = useCallback(
    (a: any): string => {
      if (a == null) return t.option || 'Option'

      if (typeof a === 'string') {
        return a
      }

      return a.label || a.name || t.option || 'Option'
    },
    [t.option],
  )

  const getValueId = useCallback((v: any): string | null => {
    if (v == null) return null

    if (typeof v === 'string' || typeof v === 'number') {
      return String(v)
    }

    return v.id != null ? String(v.id) : null
  }, [])

  const getValueName = useCallback(
    (v: any): string => {
      if (v == null) return t.option || 'Option'

      if (typeof v === 'string') {
        return v
      }

      return (
        v.label ||
        v.value ||
        v.name ||
        t.option ||
        'Option'
      )
    },
    [t.option],
  )

  const valuesByAttribute = useMemo(() => {
    const map = new Map<string, any[]>()

    ;(product.productAttributes ?? []).forEach((row: any) => {
      if (!row?.attribute) return

      const attributeId =
        typeof row.attribute === 'object'
          ? String(row.attribute.id)
          : String(row.attribute)

      if (!attributeId) return

      map.set(attributeId, Array.isArray(row.values) ? row.values : [])
    })

    return map
  }, [product.productAttributes])

  const getValues = useCallback(
    (attributeId: string) => {
      return valuesByAttribute.get(String(attributeId)) ?? []
    },
    [valuesByAttribute],
  )

  /**
   * If the server gave us an initialVariant, convert its combination
   * directly into selected attribute/value IDs.
   *
   * This is synchronous and available during render.
   */
  const initialSelectedValues = useMemo(() => {
    const result: Record<string, string> = {}

    // Prefer last variant with stock > 0, otherwise last variant
    const sourceVariant =
      initialVariant ||
      [...variants].reverse().find((variant: any) => {
        const stock = Number(variant?.stock)
        return Number.isFinite(stock) && stock > 0
      }) ||
      variants[variants.length - 1]

    if (!sourceVariant?.combination?.length) {
      return result
    }

    sourceVariant.combination.forEach((item: any) => {
      const valueId =
        typeof item === 'object' && item !== null
          ? item.id
          : item

      if (valueId == null) return

      const directAttributeId =
        typeof item?.attribute === 'object'
          ? item.attribute?.id
          : item?.attribute

      if (directAttributeId != null) {
        result[String(directAttributeId)] = String(valueId)
        return
      }

      /**
       * Fallback:
       * Find which product attribute contains this value.
       */
      for (const row of product.productAttributes ?? []) {
        if (!row?.attribute) continue

        const attributeId =
          typeof row.attribute === 'object'
            ? row.attribute.id
            : row.attribute

        if (attributeId == null) continue

        const values = Array.isArray(row.values)
          ? row.values
          : []

        const matchingValue = values.some((value: any) => {
          const id =
            typeof value === 'object'
              ? value?.id
              : value

          return String(id) === String(valueId)
        })

        if (matchingValue) {
          result[String(attributeId)] = String(valueId)
          break
        }
      }
    })

    return result
  }, [
    initialVariant,
    variants,
    product.productAttributes,
  ])

  /**
   * User selection overrides server/default selection.
   */
  const selectedValues = useMemo(() => {
    return {
      ...initialSelectedValues,
      ...userSelectedValues,
    }
  }, [initialSelectedValues, userSelectedValues])

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null

    const selectedEntries = Object.entries(selectedValues)

    if (!selectedEntries.length) {
      return null
    }

    return (
      variants.find((variant: any) => {
        const combination = Array.isArray(variant.combination)
          ? variant.combination
          : []

        if (!combination.length) {
          return false
        }

        /**
         * Every selected attribute/value must exist
         * in the variant combination.
         */
        const allSelectedMatch = selectedEntries.every(
          ([attributeId, valueId]) => {
            return combination.some((item: any) => {
              const itemValueId =
                typeof item === 'object' && item !== null
                  ? item.id
                  : item

              const itemAttributeId =
                typeof item?.attribute === 'object'
                  ? item.attribute?.id
                  : item?.attribute

              if (itemValueId == null) {
                return false
              }

              if (itemAttributeId != null) {
                return (
                  String(itemAttributeId) === String(attributeId) &&
                  String(itemValueId) === String(valueId)
                )
              }

              return String(itemValueId) === String(valueId)
            })
          },
        )

        if (!allSelectedMatch) {
          return false
        }

        /**
         * The number of selected values must match
         * the number of values in the variant combination.
         */
        const combinationValueIds = combination
          .map((item: any) =>
            typeof item === 'object' && item !== null
              ? item.id
              : item,
          )
          .filter((id: any) => id != null)
          .map(String)

        const selectedValueIds = selectedEntries.map(
          ([, valueId]) => String(valueId),
        )

        if (
          combinationValueIds.length !==
          selectedValueIds.length
        ) {
          return false
        }

        return combinationValueIds.every((id: string) =>
          selectedValueIds.includes(id),
        )
      }) || null
    )
  }, [variants, selectedValues])

  /**
   * This effect is ONLY for notifying parent components.
   * It does NOT load stock or select the initial variant.
   */
  useEffect(() => {
    const variantId =
      selectedVariant?.id != null
        ? String(selectedVariant.id)
        : null

    if (lastVariantId.current === variantId) {
      return
    }

    lastVariantId.current = variantId

    if (!selectedVariant) {
      onVariantChange?.(null)
      return
    }

    onVariantChange?.({
      ...selectedVariant,
      price: selectedVariant.price,
      oldPrice: selectedVariant.oldPrice ?? null,
    })

    const colorItem = Array.isArray(
      selectedVariant.combination,
    )
      ? selectedVariant.combination.find((item: any) => {
          const attribute = item?.attribute

          const name =
            typeof attribute === 'object'
              ? attribute?.label || attribute?.name || ''
              : attribute || ''

          return isColor(name)
        })
      : null

    if (colorItem) {
      const color = getValueName(
        typeof colorItem === 'object'
          ? colorItem
          : null,
      )
        ?.toLowerCase()
        .trim()

      onColorSelect?.(color || null)
    } else {
      onColorSelect?.(null)
    }
  }, [
    selectedVariant,
    onVariantChange,
    onColorSelect,
    getValueName,
  ])

  const selectValue = useCallback(
    (attributeId: string, valueId: string) => {
      setUserSelectedValues((prev) => ({
        ...prev,
        [attributeId]: valueId,
      }))
    },
    [],
  )

  /** Réduction portée par les catégories du produit, 0 si aucune. */
  const promoPercentage = useMemo(
    () => getProductPromoPercentage(product),
    [product],
  )

  const basePrice = useMemo(() => {
    // Un variant sans prix (0 ou vide) prend celui du produit : sinon la
    // page affichait « 0 DT » et le panier facturait 0.
    if (selectedVariant) {
      return Number(selectedVariant.price) || Number(product.currentPrice) || 0
    }

    return (
      Number(variants[0]?.price) ||
      Number(product.currentPrice) ||
      0
    )
  }, [
    selectedVariant,
    variants,
    product.currentPrice,
  ])

  const baseOldPrice = useMemo(() => {
    if (selectedVariant) {
      return selectedVariant.oldPrice ?? null
    }

    return (
      variants[0]?.oldPrice ??
      product.oldPrice ??
      null
    )
  }, [
    selectedVariant,
    variants,
    product.oldPrice,
  ])

  /**
   * La promotion de catégorie prime sur celle du produit : sous promo, le prix
   * barré affiché est le prix de base du variant sélectionné.
   */
  const { currentPrice, currentOldPrice } = useMemo(() => {
    const { price, oldPrice } = getPromoPricing(basePrice, baseOldPrice, promoPercentage)
    return { currentPrice: price, currentOldPrice: oldPrice }
  }, [basePrice, baseOldPrice, promoPercentage])

  const currentStock = useMemo(() => {
    /**
     * Exact selected variant.
     */
    if (selectedVariant) {
      const stock = Number(selectedVariant.stock)

      return Number.isFinite(stock) ? stock : 0
    }

    /**
     * Simple product without attributes.
     */
    if (attributes.length === 0) {
      if (variants.length > 0) {
        return variants.reduce(
          (sum: number, variant: any) => {
            const stock = Number(variant?.stock)

            return (
              sum +
              (Number.isFinite(stock) ? stock : 0)
            )
          },
          0,
        )
      }

      const totalStock = Number(
        (product as any).totalStock,
      )

      return Number.isFinite(totalStock)
        ? totalStock
        : 0
    }

    /**
     * Attributes exist but current selection does
     * not correspond to a real variant.
     */
    return 0
  }, [
    selectedVariant,
    variants,
    attributes.length,
    product,
  ])

  const getSelectedAttributesForCart = useCallback(() => {
    if (Object.keys(selectedValues).length > 0) {
      return attributes
        .map((attribute: any) => {
          const attributeId =
            getAttributeId(attribute)

          if (!attributeId) return null

          const valueId =
            selectedValues[attributeId]

          if (!valueId) return null

          const value = getValues(attributeId).find(
            (v: any) =>
              String(getValueId(v)) ===
              String(valueId),
          )

          return {
            attribute:
              getAttributeName(attribute),
            value: getValueName(value),
          }
        })
        .filter(Boolean) as {
        attribute: string
        value: string
      }[]
    }

    if (!selectedVariant) {
      return []
    }

    const variantAttrs =
      selectedVariant.attributes

    const combination =
      selectedVariant.combination || []

    if (
      !Array.isArray(variantAttrs) ||
      variantAttrs.length === 0
    ) {
      return combination
        .map((item: any) => {
          const attribute =
            typeof item === 'object'
              ? item?.attribute
              : null

          return {
            attribute:
              getAttributeName(attribute),
            value: getValueName(
              typeof item === 'object'
                ? item
                : null,
            ),
          }
        })
        .filter(
          (row: any) =>
            row.attribute && row.value,
        )
    }

    return variantAttrs
      .map((attrEntry: any, index: number) => {
        const attributeId =
          getAttributeId(attrEntry)

        const attributeFromList =
          attributes.find(
            (attribute: any) =>
              getAttributeId(attribute) ===
              attributeId,
          )

        const attribute =
          attributeFromList ||
          (typeof attrEntry === 'object'
            ? attrEntry
            : null)

        const comboItem = combination[index]

        const comboValueId =
          typeof comboItem === 'object' &&
          comboItem !== null
            ? comboItem.id
            : comboItem

        const valueFromValues = attributeId
          ? getValues(attributeId).find(
              (value: any) =>
                String(
                  getValueId(value),
                ) ===
                String(comboValueId),
            )
          : null

        const value =
          valueFromValues ||
          (typeof comboItem === 'object'
            ? comboItem
            : null)

        return {
          attribute:
            getAttributeName(attribute),
          value: getValueName(value),
        }
      })
      .filter(Boolean)
  }, [
    selectedVariant,
    selectedValues,
    attributes,
    getValues,
    getAttributeId,
    getAttributeName,
    getValueId,
    getValueName,
  ])

  const allAttributesSelected = useMemo(() => {
    if (attributes.length === 0) {
      return true
    }

    return attributes.every((attribute: any) => {
      const id = getAttributeId(attribute)

      return !!id && !!selectedValues[id]
    })
  }, [
    attributes,
    selectedValues,
    getAttributeId,
  ])

  const resetSelection = useCallback(() => {
    setUserSelectedValues({})
    onColorSelect?.(null)
  }, [onColorSelect])

  return {
    variants,
    attributes,
    selectedValues,
    selectedVariant,
    currentPrice,
    currentOldPrice,
    promoPercentage,
    currentStock,
    allAttributesSelected,
    selectValue,
    getValues,
    getAttributeId,
    getAttributeName,
    getValueId,
    getValueName,
    getSelectedAttributesForCart,
    resetSelection,
    isColorAttributeName: isColor,
  }
}