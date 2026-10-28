export type StockStatus = 'in_stock' | 'out_of_stock'

export type InventoryMovementType =
  | 'stock_entry'
  | 'stock_exit'
  | 'order_deduct'
  | 'order_restore'
  | 'manual_adjustment'
  | 'variant_recalc'
  | 'customer_return'

export interface NormalizedOrderItem {
  productId: string
  variantId?: string | null
  title?: string | null
  attributes?: string | null
  quantity: number
  price: number
  subtotal: number
}

export function isStockReserved(status?: string | null) {
  return status === 'validated'
}

/**
 * Rupture de stock dès que le stock est nul ou négatif.
 *
 * Un stock négatif (correction manuelle, restauration après ajustement) doit
 * compter comme une rupture : la boutique le traite déjà ainsi, l'admin doit
 * dire la même chose.
 */
export function getStockStatus(stock: number): StockStatus {
  const value = Number(stock) || 0
  if (value <= 0) return 'out_of_stock'
  return 'in_stock'
}

export function getProductAvailableStock(product: any): number {
  if (!product) return 0

  // Always use totalStock since all products now use variants
  return Number(product.totalStock) || 0
}

export function normalizeOrderItems(order: any): NormalizedOrderItem[] {
  if (!order) return []

  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items
      .map((item: any) => {
        const quantity = Math.max(1, Number(item.quantity) || 1)
        const price = Number(item.price) || 0
        return {
          productId: String(item.productId || ''),
          variantId: item.variantId || null,
          title: item.title || null,
          attributes: item.attributes || null,
          quantity,
          price,
          subtotal: Number(item.subtotal) || price * quantity,
        }
      })
      .filter((item: NormalizedOrderItem) => item.productId)
  }

  if (!Array.isArray(order.product) || order.product.length === 0) {
    return []
  }

  const totalQuantity = Math.max(1, Number(order.quantity) || order.product.length)
  const perProductQuantity = Math.max(1, Math.floor(totalQuantity / order.product.length))
  const totalAmount = Number(order.totalAmount) || 0
  const perProductAmount = order.product.length > 0 ? totalAmount / order.product.length : 0

  return order.product
    .map((item: any) => {
      const productId = typeof item === 'object' ? item?.id : item
      const title = typeof item === 'object' ? item?.productTitle || item?.title || null : null
      const price = typeof item === 'object' ? Number(item?.currentPrice || item?.price) || 0 : 0

      return {
        productId: String(productId || ''),
        variantId: null,
        title,
        attributes: null,
        quantity: perProductQuantity,
        price,
        subtotal: price > 0 ? price * perProductQuantity : perProductAmount,
      }
    })
    .filter((item: NormalizedOrderItem) => item.productId)
}

export function getStockErrorMessage(title: string, requested: number, available: number) {
  return `Stock insuffisant pour "${title}". Demandé: ${requested}, disponible: ${available}.`
}