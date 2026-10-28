import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'
import {
  getStockStatus,
  normalizeOrderItems,
} from '@/utilities/inventory'

type AnyDoc = Record<string, any>

function getLocalizedText(value: any) {
  if (!value) return ''
  if (typeof value === 'string') return value

  if (typeof value === 'object') {
    const values = Object.values(value).filter((entry) => typeof entry === 'string') as string[]
    return values.find((entry) => entry.trim().length > 0) || ''
  }

  return String(value)
}

function hasProductImage(product: AnyDoc) {
  return Boolean(product.featuredImage || (Array.isArray(product.gallery) && product.gallery.length > 0))
}

function isValidatedOrder(order: AnyDoc) {
  return String(order.status || '') === 'validated'
}

async function fetchAll<T extends AnyDoc>(
  payload: any,
  collection: string,
  options: Record<string, any> = {},
) {
  const docs: T[] = []
  let page = 1
  let totalPages = 1

  do {
    const result = await payload.find({
      collection,
      page,
      limit: 100,
      depth: 1,
      overrideAccess: true,
      ...options,
    })

    docs.push(...(result.docs as T[]))
    totalPages = result.totalPages || 1
    page += 1
  } while (page <= totalPages)

  return docs
}

function getProductStock(product: AnyDoc, variantsByProduct: Record<string, AnyDoc[]>) {
  // Always calculate stock from variants
  const productVariants = variantsByProduct[product.id] || []
  return productVariants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0)
}

function getProductStockValue(product: AnyDoc, variantsByProduct: Record<string, AnyDoc[]>) {
  // Always calculate stock value from variants
  const productVariants = variantsByProduct[product.id] || []
  return productVariants.reduce((sum, variant) => {
    const stock = Number(variant.stock) || 0
    const price = Number(variant.price ?? product.currentPrice) || 0
    return sum + stock * price
  }, 0)
}

function getMovementDirection(movement: AnyDoc) {
  const beforeStock = Number(movement.beforeStock) || 0
  const afterStock = Number(movement.afterStock) || 0
  if (afterStock > beforeStock) return 'in'
  if (afterStock < beforeStock) return 'out'
  return 'neutral'
}

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Commandes, stock et mouvements : réservés à l'équipe connectée.
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [products, variants, orders, movements] = await Promise.all([
      // draft: true → même vue que la liste admin (latest version)
      fetchAll<AnyDoc>(payload, 'products', { draft: true }),
      fetchAll<AnyDoc>(payload, 'variants'),
      fetchAll<AnyDoc>(payload, 'orders', { sort: '-createdAt' }),
      fetchAll<AnyDoc>(payload, 'inventory-movements', { sort: '-createdAt' }),
    ])

    const variantsByProduct: Record<string, AnyDoc[]> = {}
    for (const variant of variants) {
      const productId = typeof variant.product === 'object' ? variant.product?.id : variant.product
      if (!productId) continue
      if (!variantsByProduct[productId]) {
        variantsByProduct[productId] = []
      }
      variantsByProduct[productId].push(variant)
    }

    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)
    const monthStart = new Date(now)
    monthStart.setDate(monthStart.getDate() - 30)

    let totalOrders = 0
    let ordersToday = 0
    let ordersWeek = 0
    let ordersMonth = 0
    let revenueToday = 0
    let revenueWeek = 0
    let revenueMonth = 0
    let activeOrderCount = 0
    let activeRevenue = 0
    const activeCustomers = new Set<string>()
    const salesMap: Record<
      string,
      {
        title: string
        sales: number
        revenue: number
      }
    > = {}

    for (const order of orders) {
      const createdAt = order.createdAt ? new Date(order.createdAt) : null
      const totalAmount = Number(order.totalAmount) || 0

      totalOrders += 1

      if (createdAt && createdAt >= todayStart) {
        ordersToday += 1
      }
      if (createdAt && createdAt >= weekStart) {
        ordersWeek += 1
      }
      if (createdAt && createdAt >= monthStart) {
        ordersMonth += 1
      }

      if (!isValidatedOrder(order)) {
        continue
      }

      activeOrderCount += 1
      activeRevenue += totalAmount

      if (createdAt && createdAt >= todayStart) {
        revenueToday += totalAmount
      }
      if (createdAt && createdAt >= weekStart) {
        revenueWeek += totalAmount
      }
      if (createdAt && createdAt >= monthStart) {
        revenueMonth += totalAmount
      }

      if (createdAt && createdAt >= monthStart) {
        const customerKey = [order.customerPhone, order.customerName].filter(Boolean).join('|')
        if (customerKey) {
          activeCustomers.add(customerKey)
        }
      }

      const orderItems = normalizeOrderItems(order)
      for (const item of orderItems) {
        const productId = item.productId
        if (!productId) continue

        if (!salesMap[productId]) {
          salesMap[productId] = {
            title: item.title || 'Produit',
            sales: 0,
            revenue: 0,
          }
        }

        const quantity = Math.max(1, Number(item.quantity) || 1)
        const subtotal = Number(item.subtotal) || (Number(item.price) || 0) * quantity

        salesMap[productId].sales += quantity
        salesMap[productId].revenue += subtotal
      }
    }

    let totalProducts = 0
    let publishedCount = 0
    let draftCount = 0
    let inStockCount = 0
    let outOfStockCount = 0
    let productsWithoutImage = 0
    let productsWithoutCategory = 0
    let productsWithoutDescription = 0
    let incompleteProducts = 0
    let newToday = 0
    let newThisWeek = 0
    let newThisMonth = 0
    let totalStock = 0
    let stockValue = 0
    const inStockIds: string[] = []
    const outOfStockIds: string[] = []

    const productRows = products.map((product) => {
      totalProducts += 1

      const title = getLocalizedText(product.productTitle) || 'Produit'
      // Source de vérité = somme des variants (même logique que le dashboard)
      const stock = getProductStock(product, variantsByProduct)
      const value = getProductStockValue(product, variantsByProduct)
      const stockStatus = getStockStatus(stock)
      const createdAt = product.createdAt ? new Date(product.createdAt) : null
      const hasCategory = Array.isArray(product.categories) && product.categories.length > 0
      const hasDescription = Boolean(getLocalizedText(product.description).trim())
      const sales = salesMap[product.id] || { title, sales: 0, revenue: 0 }
      const productId = String(product.id)

      if (product._status === 'published') {
        publishedCount += 1
      } else {
        draftCount += 1
      }

      if (stockStatus === 'in_stock') {
        inStockCount += 1
        inStockIds.push(productId)
      }
      if (stockStatus === 'out_of_stock') {
        outOfStockCount += 1
        outOfStockIds.push(productId)
      }

      if (!hasProductImage(product)) {
        productsWithoutImage += 1
      }
      if (!hasCategory) {
        productsWithoutCategory += 1
      }
      if (!hasDescription) {
        productsWithoutDescription += 1
      }
      if (!hasProductImage(product) || !hasCategory || !hasDescription) {
        incompleteProducts += 1
      }

      if (createdAt && createdAt >= todayStart) {
        newToday += 1
      }
      if (createdAt && createdAt >= weekStart) {
        newThisWeek += 1
      }
      if (createdAt && createdAt >= monthStart) {
        newThisMonth += 1
      }

      totalStock += stock
      stockValue += value

      return {
        id: product.id,
        title,
        stock,
        value,
        stockStatus,
        createdAt: createdAt?.toISOString() || null,
        hasImage: hasProductImage(product),
        hasCategory,
        hasDescription,
        sales,
      }
    })

    const totalSoldUnits = productRows.reduce((sum, row) => sum + (row.sales?.sales || 0), 0)

    const topProducts = productRows
      .filter((row) => (row.sales?.sales || 0) > 0)
      .sort((a, b) => (b.sales?.sales || 0) - (a.sales?.sales || 0))
      .slice(0, 5)
      .map((row, index) => ({
        rank: index + 1,
        id: row.id,
        title: row.title,
        sales: row.sales.sales,
        revenue: row.sales.revenue,
        stock: row.stock,
        stockStatus: row.stockStatus,
        share: totalSoldUnits > 0 ? Math.round((row.sales.sales / totalSoldUnits) * 100) : 0,
      }))

    const recentMovements = movements.slice(0, 5).map((movement) => {
      const product = typeof movement.product === 'object' ? movement.product : null
      const variant = typeof movement.variant === 'object' ? movement.variant : null
      const productTitle = product ? getLocalizedText(product.productTitle) || 'Produit' : 'Produit'
      const direction = getMovementDirection(movement)

      return {
        id: movement.id,
        movementType: movement.movementType,
        productTitle,
        variantTitle: variant?.sku || null,
        quantity: Number(movement.quantity) || 0,
        beforeStock: Number(movement.beforeStock) || 0,
        afterStock: Number(movement.afterStock) || 0,
        direction,
        createdAt: movement.createdAt || null,
      }
    })

    const inventoryMovementsToday = movements.filter((movement) => {
      const createdAt = movement.createdAt ? new Date(movement.createdAt) : null
      return Boolean(createdAt && createdAt >= todayStart)
    }).length

    const inventoryMovementsWeek = movements.filter((movement) => {
      const createdAt = movement.createdAt ? new Date(movement.createdAt) : null
      return Boolean(createdAt && createdAt >= weekStart)
    }).length

    const inventoryEntriesToday = movements
      .filter((movement) => {
        const createdAt = movement.createdAt ? new Date(movement.createdAt) : null
        return Boolean(createdAt && createdAt >= todayStart)
      })
      .reduce((sum, movement) => {
        const delta = (Number(movement.afterStock) || 0) - (Number(movement.beforeStock) || 0)
        return delta > 0 ? sum + delta : sum
      }, 0)

    const inventoryExitsToday = movements
      .filter((movement) => {
        const createdAt = movement.createdAt ? new Date(movement.createdAt) : null
        return Boolean(createdAt && createdAt >= todayStart)
      })
      .reduce((sum, movement) => {
        const delta = (Number(movement.afterStock) || 0) - (Number(movement.beforeStock) || 0)
        return delta < 0 ? sum + Math.abs(delta) : sum
      }, 0)

    const lastMovement = recentMovements[0] || null
    const averageOrder = activeOrderCount > 0 ? activeRevenue / activeOrderCount : 0

    return NextResponse.json({
      totalProducts,
      publishedCount,
      draftCount,
      inStockCount,
      outOfStockCount,
      inStockIds,
      outOfStockIds,
      totalStock,
      stockValue,
      totalOrders,
      ordersToday,
      ordersWeek,
      ordersMonth,
      revenueToday,
      revenueWeek,
      revenueMonth,
      averageOrder,
      activeCustomers: activeCustomers.size,
      inventoryMovementsToday,
      inventoryMovementsWeek,
      inventoryEntriesToday,
      inventoryExitsToday,
      lastMovement,
      recentMovements,
      topProducts,
      productsWithoutImage,
      productsWithoutCategory,
      productsWithoutDescription,
      incompleteProducts,
      newToday,
      newThisWeek,
      newThisMonth,
    })
  } catch (error) {
    console.error('[product-health] Failed to compute stats:', error)

    return NextResponse.json(
      {
        message: 'Failed to compute product health',
      },
      { status: 500 },
    )
  }
}