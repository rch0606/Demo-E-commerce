// hooks/syncInventory.ts

import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
} from 'payload'
import { APIError } from 'payload'

import {
  getStockErrorMessage,
  normalizeOrderItems,
} from '@/utilities/inventory'

/** Vérifie le stock avant écriture (message d'erreur propre renvoyé au client) */
export const validateStockBeforeOrderChange: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  const nextStatus = data?.status ?? originalDoc?.status
  const previousStatus = originalDoc?.status

  // Déduction effective : création validée, ou passage vers validée.
  const willDeduct =
    nextStatus === 'validated' &&
    (operation === 'create' || previousStatus !== 'validated')

  /**
   * Toute commande est vérifiée dès sa création, même au statut « nouvelle ».
   * Le stock n'était contrôlé qu'à la validation : une commande boutique
   * portant sur un article épuisé était acceptée sans un mot, et l'erreur ne
   * surgissait que des jours plus tard, au clic sur « Valider ».
   *
   * Attention : ceci vérifie la disponibilité, cela ne la réserve pas. Deux
   * commandes simultanées sur la dernière pièce passent toujours toutes les
   * deux ; seule une déduction à la création l'empêcherait, et c'est une
   * décision commerciale, pas technique.
   */
  if (!willDeduct && operation !== 'create') {
    return data
  }

  const orderForCheck = {
    ...originalDoc,
    ...data,
    items: data?.items ?? originalDoc?.items,
    product: data?.product ?? originalDoc?.product,
    quantity: data?.quantity ?? originalDoc?.quantity,
  }

  const items = normalizeOrderItems(orderForCheck)
  const payload = req.payload

  for (const item of items) {
    const quantity = Math.max(1, Number(item.quantity) || 1)
    if (!item.productId) continue

    if (item.variantId) {
      const variant = await payload.findByID({
        collection: 'variants',
        id: item.variantId,
        depth: 0,
        overrideAccess: true,
      })

      const available = Number(variant?.stock) || 0
      if (available < quantity) {
        throw new APIError(
          getStockErrorMessage(
            variant?.sku || item.title || item.variantId,
            quantity,
            available,
          ),
          400,
        )
      }
      continue
    }

    const product = await payload.findByID({
      collection: 'products',
      id: item.productId,
      depth: 1,
      overrideAccess: true,
    })

    const docs =
      (product as any)?.variants?.docs ??
      (Array.isArray((product as any)?.variants) ? (product as any).variants : [])
    const available =
      Array.isArray(docs) && docs.length > 0
        ? docs.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0)
        : Number(product?.totalStock) || 0

    if (available < quantity) {
      throw new APIError(
        getStockErrorMessage(
          (typeof product?.productTitle === 'string' ? product.productTitle : null) ||
            item.title ||
            item.productId,
          quantity,
          available,
        ),
        400,
      )
    }
  }

  return data
}

// ============================================
// HELPER: Recalculate totalStock for variable products
// ============================================
async function recalculateProductTotalStock(payload: any, productId: string) {
  try {
    const variants = await payload.find({
      collection: 'variants',
      where: {
        product: { equals: productId },
      },
      limit: 1000,
      depth: 0,
    })

    const newTotalStock = variants.docs.reduce(
      (sum: number, variant: any) => sum + (variant.stock || 0),
      0
    )

    await payload.update({
      collection: 'products',
      id: productId,
      data: {
        totalStock: newTotalStock,
      },
    })

    console.log(`✅ Updated totalStock for product ${productId}: ${newTotalStock}`)
  } catch (error) {
    console.error(`❌ Error recalculating totalStock for product ${productId}:`, error)
  }
}

// ============================================
// HELPER: Write inventory movement record
// ============================================
async function writeInventoryMovement({
  payload,
  order,
  item,
  quantity,
  beforeStock,
  afterStock,
  direction,
  req,
}: {
  payload: any
  order: any
  item: any
  quantity: number
  beforeStock: number
  afterStock: number
  direction: 'deduct' | 'restore'
  req: any
}) {
  await payload.create({
    collection: 'inventory-movements',
    data: {
      movementType: direction === 'deduct' ? 'order_deduct' : 'order_restore',
      product: item.productId,
      variant: item.variantId || undefined,
      order: order.id,
      quantity,
      beforeStock,
      afterStock,
      reason: direction === 'deduct'
        ? `Commande ${order.orderNumber || order.id}`
        : `Retour de stock pour ${order.orderNumber || order.id}`,
      ...(req.user?.id && {
        performedBy: req.user.id,
      }),
      notes: item.title || null,
    },
    depth: 0,
    overrideAccess: true,
  })
}

// ============================================
// CORE: Apply inventory change (deduct or restore)
// ============================================
async function applyInventoryChange({
  payload,
  order,
  direction,
  req,
}: {
  payload: any
  order: any
  direction: 'deduct' | 'restore'
  req: any
}) {
  const items = normalizeOrderItems(order)

  if (items.length === 0) {
    return
  }

  // ---- PRE-CHECK: Verify enough stock before deducting ----
  if (direction === 'deduct') {
    for (const item of items) {
      const quantity = Math.max(1, Number(item.quantity) || 1)
      if (!item.productId) continue

      if (item.variantId) {
        const variant = await payload.findByID({
          collection: 'variants',
          id: item.variantId,
          depth: 0,
          overrideAccess: true,
        })

        const available = Number(variant?.stock) || 0
        if (available < quantity) {
          throw new APIError(
            getStockErrorMessage(variant?.sku || item.title || item.variantId, quantity, available),
            400,
          )
        }

        continue
      }

      // Produit avec variants mais sans variantId → stock depuis variants ou totalStock
      const product = await payload.findByID({
        collection: 'products',
        id: item.productId,
        depth: 1,
        overrideAccess: true,
      })

      const docs =
        (product as any)?.variants?.docs ??
        (Array.isArray((product as any)?.variants) ? (product as any).variants : [])
      const available =
        Array.isArray(docs) && docs.length > 0
          ? docs.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0)
          : Number(product?.totalStock) || 0

      if (available < quantity) {
        throw new APIError(
          getStockErrorMessage(
            (typeof product?.productTitle === 'string' ? product.productTitle : null) ||
              item.title ||
              item.productId,
            quantity,
            available,
          ),
          400,
        )
      }
    }
  }

  // ---- APPLY CHANGES ----
  for (const item of items) {
    const quantity = Math.max(1, Number(item.quantity) || 1)
    if (!item.productId) continue

    // ============================================
    // VARIABLE PRODUCT: Update variant stock
    // ============================================
    if (item.variantId) {
      const variant = await payload.findByID({
        collection: 'variants',
        id: item.variantId,
        depth: 0,
        overrideAccess: true,
      })

      if (!variant || typeof variant.stock !== 'number') continue

      const beforeStock = Number(variant.stock) || 0
      const afterStock = direction === 'deduct'
        ? Math.max(0, beforeStock - quantity)
        : beforeStock + quantity

      // Update variant stock
      await payload.update({
        collection: 'variants',
        id: item.variantId,
        data: {
          stock: afterStock,
        } as any,
        depth: 0,
        overrideAccess: true,
      })

      // ✅ RECALCULATE product totalStock after variant update
      await recalculateProductTotalStock(payload, item.productId)

      // Write movement record
      await writeInventoryMovement({
        payload,
        order,
        item,
        quantity,
        beforeStock,
        afterStock,
        direction,
        req,
      })

      continue
    }

    // ============================================
    // Produit sans variantId : stock depuis variants ou totalStock
    // ============================================
    const product = await payload.findByID({
      collection: 'products',
      id: item.productId,
      depth: 1,
      overrideAccess: true,
    })

    if (!product) continue

    const docs =
      (product as any)?.variants?.docs ??
      (Array.isArray((product as any)?.variants) ? (product as any).variants : [])
    const beforeStock =
      Array.isArray(docs) && docs.length > 0
        ? docs.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0)
        : Number(product.totalStock) || 0
    const afterStock =
      direction === 'deduct'
        ? Math.max(0, beforeStock - quantity)
        : beforeStock + quantity

    await payload.update({
      collection: 'products',
      id: item.productId,
      data: {
        totalStock: afterStock,
      } as any,
      depth: 0,
      overrideAccess: true,
    })

    await writeInventoryMovement({
      payload,
      order,
      item,
      quantity,
      beforeStock,
      afterStock,
      direction,
      req,
    })
  }
}

// ============================================
// HELPER: Get order inventory balance
// ============================================
async function getOrderInventoryBalance(payload: any, orderId: string) {
  const [deducted, restored] = await Promise.all([
    payload.find({
      collection: 'inventory-movements',
      where: {
        and: [
          {
            order: {
              equals: orderId,
            },
          },
          {
            movementType: {
              equals: 'order_deduct',
            },
          },
        ],
      },
      limit: 1000, // ✅ Fixed: Get ALL movements, not just 1
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'inventory-movements',
      where: {
        and: [
          {
            order: {
              equals: orderId,
            },
          },
          {
            movementType: {
              equals: 'order_restore',
            },
          },
        ],
      },
      limit: 1000, // ✅ Fixed: Get ALL movements, not just 1
      depth: 0,
      overrideAccess: true,
    }),
  ])

  return {
    deducted: deducted.docs.length, // ✅ Fixed: Use actual count, not totalDocs
    restored: restored.docs.length, // ✅ Fixed: Use actual count, not totalDocs
  }
}

// ============================================
// ALLOWED STATUS TRANSITIONS
// ============================================
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  new: ['validated', 'cancelled'],
  validated: ['returned', 'cancelled'],
  returned: [],
  cancelled: [],
}

// ============================================
// HOOK: Sync inventory on order status change
// ============================================
export const syncInventoryOnOrderChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const payload = req.payload
  
  // New order created → handle initial status (ex: boutique → validated)
  if (operation === 'create') {
    if (doc?.status === 'validated') {
      try {
        const { deducted, restored } = await getOrderInventoryBalance(payload, doc?.id)
        if (deducted <= restored) {
          await applyInventoryChange({
            payload,
            order: doc,
            direction: 'deduct',
            req,
          })
        }
      } catch (error: any) {
        // Remonter une erreur claire (stock insuffisant, etc.) au lieu d'un 500 générique
        if (error instanceof APIError) throw error
        console.error('[syncInventory] create/validated failed:', error)
        throw new APIError(
          error?.message || 'Erreur lors de la déduction du stock pour la commande validée.',
          400,
        )
      }
    }
    return doc
  }

  // Status didn't change → nothing to do
  if (doc?.status === previousDoc?.status) {
    return doc
  }

  // Validate the transition
  const previousStatus = previousDoc?.status || 'new'
  const newStatus = doc?.status || 'new'
  
  const allowedNext = ALLOWED_TRANSITIONS[previousStatus] || []
  if (!allowedNext.includes(newStatus)) {
    console.warn(`⚠️ Invalid status transition: ${previousStatus} → ${newStatus}`)
    return doc
  }

  const { deducted, restored } = await getOrderInventoryBalance(payload, doc?.id)

  // Moving TO validated → deduct stock (only if not already deducted)
  if (newStatus === 'validated' && deducted <= restored) {
    await applyInventoryChange({
      payload,
      order: doc,
      direction: 'deduct',
      req,
    })
  }

  // Moving FROM validated TO returned/cancelled → restore stock
  if (
    previousStatus === 'validated' && 
    (newStatus === 'returned' || newStatus === 'cancelled') &&
    deducted > restored
  ) {
    await applyInventoryChange({
      payload,
      order: doc,
      direction: 'restore',
      req,
    })
  }

  return doc
}

// ============================================
// HOOK: Restore inventory on order delete
// ============================================
export const restoreInventoryOnOrderDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const { deducted, restored } = await getOrderInventoryBalance(req.payload, doc?.id)

  if (deducted <= restored) {
    return doc
  }

  await applyInventoryChange({
    payload: req.payload,
    order: doc,
    direction: 'restore',
    req,
  })

  return doc
}