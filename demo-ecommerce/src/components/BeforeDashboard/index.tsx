import React from 'react'
import { 
  Sparkles, Package, ShoppingCart, Users, Trophy, Tags, Globe, 
  UserCheck, TrendingUp, Clock, Target, Award, Star,
  AlertTriangle, CheckCircle, XCircle, RotateCcw, BarChart3,
  Calendar, Hash, List, Layers
} from 'lucide-react'
import './index.scss'
import { getPayload } from 'payload'
import config from '@payload-config'
import { SeoDashboard } from '../SeoDashboard'
const baseClass = 'before-dashboard'

// ============================================
// HELPER FUNCTIONS
// ============================================

function fmt(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'TND' }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(value || 0))
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'TND',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCurrencyCompact(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'TND',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${Math.max(0, Math.min(100, Math.round(value || 0)))}%`
}

function normalizeOrderStatus(status: any) {
  const allowedStatuses = new Set(['new', 'validated', 'cancelled', 'returned'])
  const normalizedStatus = String(status || 'new')
  return allowedStatuses.has(normalizedStatus) ? normalizedStatus : 'new'
}

// ============================================
// DONUT CHART COMPONENT
// ============================================

const DonutChart = ({ 
  data, 
  title,
  total,
  totalLabel 
}: { 
  data: Array<{ label: string; value: number; color: string }>
  title: string
  total: number
  totalLabel: string
}) => {
  const totalValue = data.reduce((sum, item) => sum + item.value, 0)
  let cumulativePercent = 0

  return (
    <div className="ph-donut-chart">
      <h3 className="ph-donut-chart__title">{title}</h3>
      <div className="ph-donut-chart__container">
        <svg viewBox="0 0 200 200" className="ph-donut-chart__svg">
          {data.map((item, index) => {
            const percent = totalValue > 0 ? (item.value / totalValue) * 100 : 0
            const startAngle = (cumulativePercent / 100) * 360
            const endAngle = startAngle + (percent / 100) * 360
            cumulativePercent += percent

            const startRad = (startAngle - 90) * (Math.PI / 180)
            const endRad = (endAngle - 90) * (Math.PI / 180)
            const radius = 80
            const cx = 100
            const cy = 100

            const x1 = cx + radius * Math.cos(startRad)
            const y1 = cy + radius * Math.sin(startRad)
            const x2 = cx + radius * Math.cos(endRad)
            const y2 = cy + radius * Math.sin(endRad)

            const largeArc = percent > 50 ? 1 : 0

            const pathData = percent >= 100
              ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius} A ${radius} ${radius} 0 0 1 ${cx} ${cy - radius}`
              : `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${cx} ${cy} Z`

            return (
              <g key={index}>
                <path
                  d={pathData}
                  // var() passe par `style` : les attributs SVG ne l'acceptent pas partout.
                  style={{ fill: item.color, stroke: 'var(--dt-surface)' }}
                  strokeWidth="2"
                  className="ph-donut-chart__segment"
                >
                  <title>{`${item.label}: ${item.value} (${Math.round(percent)}%)`}</title>
                </path>
              </g>
            )
          })}
          <circle cx="100" cy="100" r="55" style={{ fill: 'var(--dt-surface)' }} />
          <text x="100" y="95" textAnchor="middle" className="ph-donut-chart__center-value">
            {formatNumber(total)}
          </text>
          <text x="100" y="115" textAnchor="middle" className="ph-donut-chart__center-label">
            {totalLabel}
          </text>
        </svg>
        <div className="ph-donut-chart__legend">
          {data.map((item, index) => {
            const percent = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0'
            return (
              <div key={index} className="ph-donut-chart__legend-item">
                <span 
                  className="ph-donut-chart__legend-color" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="ph-donut-chart__legend-label">{item.label}</span>
                <span className="ph-donut-chart__legend-value">
                  {formatNumber(item.value)} ({percent}%)
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================
// COMPONENTS
// ============================================

const SectionTitle = ({ icon: Icon, title, subtitle }: { 
  icon: React.ComponentType<{ className?: string }>, 
  title: string, 
  subtitle?: string 
}) => (
  <div className="ph-section-head">
    <div className="ph-section-head__title">
      <Icon className="ph-section-head__icon" />
      <h3>{title}</h3>
    </div>
    {subtitle && <p className="ph-section-head__subtitle">{subtitle}</p>}
  </div>
)

const MetricCard = ({
  icon: Icon,
  label,
  value,
  note,
  tone = 'ph-tone-default',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  note?: string
  tone?: string
}) => (
  <article className={`ph-metric-card ${tone}`}>
    <div className="ph-metric-card__icon">
      <Icon className="ph-metric-card__icon-svg" />
    </div>
    <div className="ph-metric-card__body">
      <div className="ph-metric-card__header">
        <span className="ph-metric-card__label">{label}</span>
      </div>
      <div className="ph-metric-card__value">{value}</div>
      {note && <div className="ph-metric-card__note">{note}</div>}
    </div>
  </article>
)

// ============================================
// DATA FETCHING FUNCTIONS
// ============================================

async function getCategoryStats(payload: any, validatedOrders: any[]) {
  const categoriesResult = await payload.find({
    collection: 'categories',
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })

  const categories = categoriesResult.docs as any[]

  const productsResult = await payload.find({
    collection: 'products',
    limit: 0,
    depth: 1,
    overrideAccess: true,
  })

  const products = productsResult.docs as any[]

  
  const productCategoryMap: Record<string, Array<{ id: string; name: string }>> = {}
  
  products.forEach(product => {
    const productCategories = product.categories
    
    if (productCategories && Array.isArray(productCategories) && productCategories.length > 0) {
      const catList = productCategories.map((cat: any) => {
        const categoryId = typeof cat === 'object' ? cat.id : cat
        const categoryName = typeof cat === 'object' 
          ? (cat.title || cat.name || cat.id) 
          : cat
        return { id: categoryId, name: categoryName }
      })
      
      productCategoryMap[product.id] = catList
    } else {
      productCategoryMap[product.id] = []
    }
  })

  const categorySales: Record<string, { 
    name: string; 
    products: Set<string>; 
    totalSold: number; 
    totalRevenue: number;
    orderCount: Set<string>;
  }> = {}

  categories.forEach(cat => {
    const catName = cat.title || cat.name || cat.id
    categorySales[cat.id] = {
      name: catName,
      products: new Set(),
      totalSold: 0,
      totalRevenue: 0,
      orderCount: new Set(),
    }
  })

  // Réservé aux produits encore au catalogue mais rattachés à aucune
  // catégorie. Les produits supprimés, eux, sont ignorés (voir plus bas).
  categorySales['uncategorized'] = {
    name: 'Non catégorisé',
    products: new Set(),
    totalSold: 0,
    totalRevenue: 0,
    orderCount: new Set(),
  }

  for (const order of validatedOrders) {
    if (Array.isArray(order.items) && order.items.length > 0) {
      for (const item of order.items) {
        const pid = item.productId

        /**
         * Produit supprimé depuis la commande : la ligne est écartée de la
         * répartition par catégorie.
         *
         * `productCategoryMap` contient une entrée pour chaque produit encore
         * au catalogue, même sans catégorie : l'absence de clé signifie donc
         * « supprimé », et non « non catégorisé ». Sans cette distinction, un
         * produit effacé faisait apparaître une ligne « Non catégorisé »
         * fantôme, qu'aucune fiche produit ne permettait plus d'expliquer.
         */
        const productStillExists =
          pid != null && Object.prototype.hasOwnProperty.call(productCategoryMap, pid)

        if (!productStillExists) continue

        const productCategories = productCategoryMap[pid] || []
        const qty = item.quantity || 1
        const subtotal = item.subtotal || (item.price || 0) * qty

        if (productCategories.length === 0) {
          categorySales['uncategorized'].totalSold += qty
          categorySales['uncategorized'].totalRevenue += subtotal
          categorySales['uncategorized'].orderCount.add(order.id)
          if (pid) categorySales['uncategorized'].products.add(pid)
        } else {
          for (const cat of productCategories) {
            const catId = cat.id
            
            if (!categorySales[catId]) {
              categorySales[catId] = {
                name: cat.name || 'Inconnu',
                products: new Set(),
                totalSold: 0,
                totalRevenue: 0,
                orderCount: new Set(),
              }
            }

            categorySales[catId].totalSold += qty
            categorySales[catId].totalRevenue += subtotal
            categorySales[catId].orderCount.add(order.id)
            if (pid) categorySales[catId].products.add(pid)
          }
        }
      }
    }
  }

  const categoryRows = Object.entries(categorySales)
    .map(([id, data]) => ({
      id,
      name: data.name,
      productCount: data.products.size,
      totalSold: data.totalSold,
      totalRevenue: data.totalRevenue,
      orderCount: data.orderCount.size,
      averagePerOrder: data.orderCount.size > 0 ? data.totalRevenue / data.orderCount.size : 0,
    }))
    .filter(row => row.totalSold > 0 || row.productCount > 0)
    .sort((a, b) => b.orderCount - a.orderCount)

  const totalCategoryRevenue = categoryRows.reduce((sum, row) => sum + row.totalRevenue, 0)
  const totalCategorySold = categoryRows.reduce((sum, row) => sum + row.totalSold, 0)
  const totalCategoryOrders = categoryRows.reduce((sum, row) => sum + row.orderCount, 0)
  const maxOrders = categoryRows.length > 0 ? categoryRows[0].orderCount : 1

  const topCategories = categoryRows.slice(0, 5).map((row, index) => ({
    ...row,
    rank: index + 1,
    share: Math.round((row.orderCount / maxOrders) * 100),
    revenueShare: totalCategoryRevenue > 0 ? Math.round((row.totalRevenue / totalCategoryRevenue) * 100) : 0,
    orderShare: totalCategoryOrders > 0 ? Math.round((row.orderCount / totalCategoryOrders) * 100) : 0,
  }))


  return {
    categoryRows,
    topCategories,
    totalCategoryRevenue,
    totalCategorySold,
    totalCategoryOrders,
    categoryCount: categoryRows.length,
  }
}

function getSourceStats(orders: any[]) {
  const sourceLabels: Record<string, string> = {
    website: 'Site Web',
    instagram: 'Instagram',
    facebook: 'Facebook',
    whatsapp: 'WhatsApp',
    boutique: 'Boutique',
  }

  const sourceStats: Record<string, {
    label: string
    total: number
    validated: number
    cancelled: number
    returned: number
    new: number
  }> = {}

  Object.entries(sourceLabels).forEach(([key, label]) => {
    sourceStats[key] = { label, total: 0, validated: 0, cancelled: 0, returned: 0, new: 0 }
  })

  sourceStats['unknown'] = { label: 'Inconnu', total: 0, validated: 0, cancelled: 0, returned: 0, new: 0 }

  orders.forEach(order => {
    const source = order.source || 'unknown'
    const status = normalizeOrderStatus(order.status)
    
    if (!sourceStats[source]) {
      sourceStats[source] = { label: sourceLabels[source] || source, total: 0, validated: 0, cancelled: 0, returned: 0, new: 0 }
    }

    sourceStats[source].total++
    if (status === 'validated') {
      sourceStats[source].validated++
    } else if (status === 'cancelled') {
      sourceStats[source].cancelled++
    } else if (status === 'returned') {
      sourceStats[source].returned++
    } else if (status === 'new') {
      sourceStats[source].new++
    }
  })

  const sourceRows = Object.entries(sourceStats)
    .map(([key, data]) => ({
      id: key,
      ...data,
      conversionRate: data.total > 0 ? Math.round((data.validated / data.total) * 100) : 0,
    }))
    .filter(row => row.total > 0)
    .sort((a, b) => b.total - a.total)

  const totalOrders = sourceRows.reduce((sum, row) => sum + row.total, 0)
  const maxOrders = sourceRows.length > 0 ? sourceRows[0].total : 1

  const topSources = sourceRows.slice(0, 5).map((row, index) => ({
    ...row,
    rank: index + 1,
    share: Math.round((row.total / maxOrders) * 100),
  }))

  return { sourceRows, topSources, totalSourceOrders: totalOrders, sourceCount: sourceRows.length }
}

function getGouvernoratStats(orders: any[]) {
  const gouvernoratLabels: Record<string, string> = {
    'tunis': 'Tunis',
    'ariana': 'Ariana',
    'ben_arous': 'Ben Arous',
    'manouba': 'Manouba',
    'nabeul': 'Nabeul',
    'zaghouan': 'Zaghouan',
    'bizerte': 'Bizerte',
    'beja': 'Béja',
    'jendouba': 'Jendouba',
    'kef': 'Le Kef',
    'siliana': 'Siliana',
    'sousse': 'Sousse',
    'monastir': 'Monastir',
    'mahdia': 'Mahdia',
    'sfax': 'Sfax',
    'kairouan': 'Kairouan',
    'kasserine': 'Kasserine',
    'sidi_bouzid': 'Sidi Bouzid',
    'gabes': 'Gabès',
    'medenine': 'Médenine',
    'tataouine': 'Tataouine',
    'gafsa': 'Gafsa',
    'tozeur': 'Tozeur',
    'kebili': 'Kébili',
  }

  const gouvernoratStats: Record<string, {
    label: string
    total: number
    validated: number
  }> = {}

  orders.forEach(order => {
    const gouvernorat = order.customerGouvernorat?.toLowerCase().replace(/\s+/g, '_') || 'unknown'
    const status = normalizeOrderStatus(order.status)
    
    if (!gouvernoratStats[gouvernorat]) {
      gouvernoratStats[gouvernorat] = {
        label: gouvernoratLabels[gouvernorat] || order.customerGouvernorat || 'Inconnu',
        total: 0,
        validated: 0,
      }
    }

    gouvernoratStats[gouvernorat].total++
    if (status === 'validated') {
      gouvernoratStats[gouvernorat].validated++
    }
  })

  const gouvernoratRows = Object.entries(gouvernoratStats)
    .map(([key, data]) => ({
      id: key,
      ...data,
      conversionRate: data.total > 0 ? Math.round((data.validated / data.total) * 100) : 0,
    }))
    .filter(row => row.total > 0)
    .sort((a, b) => b.total - a.total)

  const totalGouvernoratOrders = gouvernoratRows.reduce((sum, row) => sum + row.total, 0)

  return { 
    gouvernoratRows, 
    totalGouvernoratOrders, 
    gouvernoratCount: gouvernoratRows.length 
  }
}

// ============================================
// SALES TEAM PERFORMANCE FUNCTION
// ============================================

async function getSalesTeamStats(payload: any, orders: any[]) {
  const usersResult = await payload.find({
    collection: 'users',
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })

  const users = usersResult.docs as any[]
  const salesUsers = users.filter((u: any) => u.role === 'sales' || u.role === 'admin')

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const salesStats: Record<string, {
    userId: string
    userName: string
    userEmail: string
    todayOrders: number
    todayValidated: number
    weekOrders: number
    weekValidated: number
    monthOrders: number
    monthValidated: number
    totalOrders: number
    totalValidated: number
    totalCancelled: number
    totalReturned: number
    conversionRate: number
  }> = {}

  salesUsers.forEach((user: any) => {
    salesStats[user.id] = {
      userId: user.id,
      userName: user.name || user.email,
      userEmail: user.email,
      todayOrders: 0,
      todayValidated: 0,
      weekOrders: 0,
      weekValidated: 0,
      monthOrders: 0,
      monthValidated: 0,
      totalOrders: 0,
      totalValidated: 0,
      totalCancelled: 0,
      totalReturned: 0,
      conversionRate: 0,
    }
  })

  orders.forEach(order => {
    const authorId = typeof order.author === 'object' ? order.author?.id : order.author
    if (!authorId || !salesStats[authorId]) return

    const status = normalizeOrderStatus(order.status)
    const orderDate = new Date(order.createdAt)
    const isToday = orderDate >= todayStart
    const isThisWeek = orderDate >= weekStart
    const isThisMonth = orderDate >= monthStart

    const stats = salesStats[authorId]
    stats.totalOrders++

    if (isToday) stats.todayOrders++
    if (isThisWeek) stats.weekOrders++
    if (isThisMonth) stats.monthOrders++

    if (status === 'validated') {
      stats.totalValidated++
      if (isToday) stats.todayValidated++
      if (isThisWeek) stats.weekValidated++
      if (isThisMonth) stats.monthValidated++
    } else if (status === 'cancelled') {
      stats.totalCancelled++
    } else if (status === 'returned') {
      stats.totalReturned++
    }
  })

  const salesRows = Object.values(salesStats)
    .map(stats => ({
      ...stats,
      conversionRate: stats.totalOrders > 0 ? Math.round((stats.totalValidated / stats.totalOrders) * 100) : 0,
    }))
    .sort((a, b) => b.monthOrders - a.monthOrders)

  const totalTeamOrders = salesRows.reduce((sum, row) => sum + row.totalOrders, 0)
  const activeSalespeople = salesRows.filter(row => row.totalOrders > 0).length

  return {
    salesRows,
    totalTeamOrders,
    activeSalespeople,
    topPerformer: salesRows[0] || null,
  }
}

// ============================================
// NEW: STOCK STATISTICS FUNCTION
// ============================================

async function getStockStats(payload: any) {
  const productsResult = await payload.find({
    collection: 'products',
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })

  const products = productsResult.docs as any[]

  const variantsResult = await payload.find({
    collection: 'variants',
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })

  const variants = variantsResult.docs as any[]

  // Build variants by product map
  const variantsByProduct: Record<string, any[]> = {}
  for (const variant of variants) {
    const productId = typeof variant.product === 'object' ? variant.product?.id : variant.product
    if (!productId) continue
    if (!variantsByProduct[productId]) {
      variantsByProduct[productId] = []
    }
    variantsByProduct[productId].push(variant)
  }

  let totalStock = 0
  let totalVariants = variants.length
  let inStockCount = 0
  let outOfStockCount = 0
  let productsWithVariants = 0
  let productsWithoutVariants = 0
  let totalStockValue = 0

  // Out of stock products (stock === 0)
  const outOfStockProducts: Array<{ title: string; variants: number }> = []

  products.forEach(product => {
    const productVariants = variantsByProduct[product.id] || []
    const productStock = productVariants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0)
    const productStockValue = productVariants.reduce((sum, variant) => {
      const stock = Number(variant.stock) || 0
      const price = Number(variant.price ?? product.currentPrice) || 0
      return sum + stock * price
    }, 0)

    totalStock += productStock
    totalStockValue += productStockValue

    if (productVariants.length > 0) {
      productsWithVariants++
    } else {
      productsWithoutVariants++
    }

    if (productStock <= 0) {
      outOfStockCount++
      outOfStockProducts.push({
        title: product.productTitle || product.title || 'Sans nom',
        variants: productVariants.length,
      })
    } else {
      inStockCount++
    }
  })

  const totalProducts = products.length

  return {
    totalProducts,
    totalStock,
    totalVariants,
    totalStockValue,
    inStockCount,
    outOfStockCount,
    productsWithVariants,
    productsWithoutVariants,
    outOfStockProducts: outOfStockProducts.slice(0, 5),
    stockHealthPercent: totalProducts > 0 ? Math.round((inStockCount / totalProducts) * 100) : 0,
    averageStockPerProduct: totalProducts > 0 ? (totalStock / totalProducts).toFixed(1) : '0',
  }
}

// ============================================
// NEW: ORDER STATISTICS FUNCTION
// ============================================

function getOrderStats(orders: any[]) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  let todayOrders = 0
  let todayValidated = 0
  let weekOrders = 0
  let weekValidated = 0
  let monthOrders = 0
  let monthValidated = 0

  const byStatus: Record<string, number> = {}
  const hourlyDistribution: Record<number, number> = {}
  
  // Initialize hourly distribution
  for (let i = 0; i < 24; i++) {
    hourlyDistribution[i] = 0
  }

  const dailyOrdersLast7Days: Record<string, number> = {}
  const last7Days: Date[] = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    const key = date.toISOString().split('T')[0]
    dailyOrdersLast7Days[key] = 0
    last7Days.push(date)
  }

  orders.forEach(order => {
    const status = normalizeOrderStatus(order.status)
    const orderDate = new Date(order.createdAt)
    const isToday = orderDate >= todayStart
    const isThisWeek = orderDate >= weekStart
    const isThisMonth = orderDate >= monthStart
    const hour = orderDate.getHours()

    // Status counts
    byStatus[status] = (byStatus[status] || 0) + 1

    // Time-based counts
    if (isToday) {
      todayOrders++
      if (status === 'validated') todayValidated++
    }
    if (isThisWeek) {
      weekOrders++
      if (status === 'validated') weekValidated++
    }
    if (isThisMonth) {
      monthOrders++
      if (status === 'validated') monthValidated++
    }

    // Hourly distribution
    hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1

    // Daily orders last 7 days
    const dayKey = orderDate.toISOString().split('T')[0]
    if (dailyOrdersLast7Days[dayKey] !== undefined) {
      dailyOrdersLast7Days[dayKey]++
    }
  })

  // Find peak hour
  let peakHour = 0
  let peakHourCount = 0
  Object.entries(hourlyDistribution).forEach(([hour, count]) => {
    if (count > peakHourCount) {
      peakHourCount = count
      peakHour = parseInt(hour)
    }
  })

  // Calculate average orders per day
  const totalDaysWithOrders = Object.values(dailyOrdersLast7Days).filter(count => count > 0).length
  const avgOrdersPerDay = last7Days.length > 0 ? 
    Object.values(dailyOrdersLast7Days).reduce((sum, count) => sum + count, 0) / last7Days.length : 0

  return {
    todayOrders,
    todayValidated,
    weekOrders,
    weekValidated,
    monthOrders,
    monthValidated,
    byStatus,
    peakHour,
    peakHourCount,
    avgOrdersPerDay: avgOrdersPerDay.toFixed(1),
    dailyOrdersLast7Days: last7Days.map(date => {
      const key = date.toISOString().split('T')[0]
      return {
        date: key,
        dayName: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        count: dailyOrdersLast7Days[key] || 0,
      }
    }),
  }
}

async function getDashboardData() {
  const payload = await getPayload({ config })

  const ordersResult = await payload.find({
    collection: 'orders',
    limit: 500,
    depth: 1,
    sort: '-createdAt',
    overrideAccess: true,
  })

  const orders = ordersResult.docs as any[]

  const productsResult = await payload.find({
    collection: 'products',
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })

  const products = productsResult.docs as any[]

  // Fetch variants to calculate stock
  const variantsResult = await payload.find({
    collection: 'variants',
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })

  const variants = variantsResult.docs as any[]

  // Build variants by product map
  const variantsByProduct: Record<string, any[]> = {}
  for (const variant of variants) {
    const productId = typeof variant.product === 'object' ? variant.product?.id : variant.product
    if (!productId) continue
    if (!variantsByProduct[productId]) {
      variantsByProduct[productId] = []
    }
    variantsByProduct[productId].push(variant)
  }

  const totalProducts = productsResult.totalDocs
  let totalStock = 0
  let inStockCount = 0
  let outOfStockCount = 0
  let stockValue = 0

  // Calculate stock from variants for each product — only in stock or out of stock (stock = 0)
  products.forEach(product => {
    const productVariants = variantsByProduct[product.id] || []
    const productStock = productVariants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0)
    const productStockValue = productVariants.reduce((sum, variant) => {
      const stock = Number(variant.stock) || 0
      const price = Number(variant.price ?? product.currentPrice) || 0
      return sum + stock * price
    }, 0)

    totalStock += productStock
    stockValue += productStockValue

    if (productStock > 0) inStockCount++
    else outOfStockCount++
  })

  const totalOrders = ordersResult.totalDocs
  const validatedOrders = orders.filter((order) => normalizeOrderStatus(order.status) === 'validated')
  const totalRevenue = validatedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0)
  const totalItems = validatedOrders.reduce((sum, o) => sum + (Number(o.quantity) || 0), 0)
  const avgOrderValue = validatedOrders.length > 0 ? totalRevenue / validatedOrders.length : 0

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const recentOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt)
    return orderDate >= thirtyDaysAgo
  })

  const customerPhones = new Set(recentOrders.filter(order => order.customerPhone).map(order => order.customerPhone))
  const activeCustomers = customerPhones.size

  const byStatus: Record<string, number> = {}
  for (const o of orders) {
    const status = normalizeOrderStatus(o.status)
    byStatus[status] = (byStatus[status] || 0) + 1
  }

  // Get all statistics
  const categoryStats = await getCategoryStats(payload, validatedOrders)
  const sourceStats = getSourceStats(orders)
  const gouvernoratStats = getGouvernoratStats(orders)
  const salesTeamStats = await getSalesTeamStats(payload, orders)
  const stockStats = await getStockStats(payload)
  const orderStats = getOrderStats(orders)

  return {
    totalProducts, totalStock, stockValue, inStockCount, outOfStockCount,
    totalOrders, totalRevenue, totalItems, avgOrderValue, activeCustomers, byStatus,
    categoryStats, sourceStats, gouvernoratStats, salesTeamStats, stockStats, orderStats,
    inventoryMovementsToday: 0, inventoryMovementsWeek: 0, inventoryEntriesToday: 0, inventoryExitsToday: 0,
  }
}

async function getCatalogStats() {
  const payload = await getPayload({ config })

  const [
    productsResult,
    categoriesResult,
    tagsResult,
    attributesResult,
    attributeValuesResult,
    variantsResult,
  ] = await Promise.all([
    payload.find({
      collection: 'products',
      limit: 0,
      depth: 0,
      overrideAccess: true,
    }),

    payload.find({
      collection: 'categories',
      limit: 0,
      depth: 0,
      overrideAccess: true,
    }),

    payload.find({
      collection: 'tags',
      limit: 0,
      depth: 0,
      overrideAccess: true,
    }),

    payload.find({
      collection: 'attributes',
      limit: 0,
      depth: 0,
      overrideAccess: true,
    }),

    payload.find({
      collection: 'attributeValues',
      limit: 0,
      depth: 0,
      overrideAccess: true,
    }),

    payload.find({
      collection: 'variants',
      limit: 0,
      depth: 0,
      overrideAccess: true,
    }),
  ])

  const products = productsResult.docs as any[]

  const productsWithoutCategories = products.filter(
    p => !p.categories || p.categories.length === 0
  ).length

  const productsWithoutImage = products.filter(
    p => !p.featuredImage
  ).length

  const productsWithoutDescription = products.filter(
    p => !p.description || p.description.trim() === ''
  ).length

  const productsWithoutSEO = products.filter(
    p => !p.meta?.title && !p.meta?.description
  ).length

  const productsWithVariants = new Set(
    (variantsResult.docs as any[]).map(v => 
      typeof v.product === 'object' ? v.product?.id : v.product
    ).filter(Boolean)
  )

  const productsWithVariantsCount = productsWithVariants.size
  const productsWithoutVariants = products.filter(
    p => !productsWithVariants.has(p.id)
  ).length

  const categoriesWithProducts = new Set(
    products.flatMap(p =>
      (p.categories || []).map((c: any) =>
        typeof c === 'object' ? c.id : c
      )
    )
  )

  const emptyCategories =
    categoriesResult.docs.filter(
      (cat: any) => !categoriesWithProducts.has(cat.id)
    ).length

  return {
    totalProducts: productsResult.totalDocs,
    totalCategories: categoriesResult.totalDocs,
    totalTags: tagsResult.totalDocs,
    totalAttributes: attributesResult.totalDocs,
    totalAttributeValues: attributeValuesResult.totalDocs,
    totalVariants: variantsResult.totalDocs,

    productsWithoutCategories,
    productsWithoutImage,
    productsWithoutDescription,
    productsWithoutSEO,

    productsWithVariants: productsWithVariantsCount,
    productsWithoutVariants,

    emptyCategories,
  }
}

// ============================================
// COLOR PALETTE
// ============================================

const SOURCE_COLORS: Record<string, string> = {
  website: 'var(--dt-accent)',
  instagram: 'color-mix(in srgb, var(--dt-accent) 50%, var(--dt-purple))',
  facebook: 'var(--dt-purple)',
  whatsapp: 'var(--dt-success)',
  boutique: 'var(--dt-warning)',
  unknown: 'var(--dt-text-muted)',
}

const GOUVERNORAT_COLORS = [
  'var(--dt-accent)', 'var(--dt-purple)', 'var(--dt-success)', 'var(--dt-warning)', 'var(--dt-danger)',
  'var(--dt-neutral-text)', 'var(--dt-accent-soft)', 'var(--dt-purple-text)', 'var(--dt-success-text)', 'var(--dt-warning-text)',
  'var(--dt-accent)', 'var(--dt-purple)', 'var(--dt-success)', 'var(--dt-warning)', 'var(--dt-danger)',
  'var(--dt-neutral-text)', 'var(--dt-accent-soft)', 'var(--dt-purple-text)', 'var(--dt-success-text)', 'var(--dt-warning-text)',
  'var(--dt-accent)', 'var(--dt-purple)', 'var(--dt-success)', 'var(--dt-warning)',
]

const PERFORMANCE_COLORS = ['var(--dt-warning)', 'var(--dt-text-muted)', 'var(--dt-warning-text)', 'var(--dt-purple)', 'var(--dt-accent)']

// ============================================
// MAIN COMPONENT
// ============================================
type BeforeDashboardProps = {
  user?: {
    role?: 'admin' | 'sales' | 'seo' | string
  }
}

export const BeforeDashboard = async ({
  user,
}: BeforeDashboardProps) => {
  if (user?.role === 'seo') {
    const stats = await getCatalogStats()
    return (
      <SeoDashboard 
        stats={stats}
        user={user}
      />
    )
  }

  const {
    totalProducts,
    totalStock,
    stockValue,
    inStockCount,
    totalOrders,
    totalRevenue,
    totalItems,
    avgOrderValue,
    activeCustomers,
    byStatus,
    categoryStats,
    sourceStats,
    gouvernoratStats,
    salesTeamStats,
    stockStats,
    orderStats,
    inventoryMovementsToday,
    inventoryMovementsWeek,
    inventoryEntriesToday,
    inventoryExitsToday,
  } = await getDashboardData()

  const statusLabels: Record<string, string> = {
    new: 'Nouvelle',
    validated: 'Validée',
    cancelled: 'Annulée',
    returned: 'Retournée',
  }

  const statusColors: Record<string, string> = {
    new: 'var(--dt-purple)',
    validated: 'var(--dt-success)',
    cancelled: 'var(--dt-danger)',
    returned: 'var(--dt-neutral-text)',
  }

  // Status donut chart data
  const statusDonutData = Object.entries(byStatus).map(([status, count]) => ({
    label: statusLabels[status] || status,
    value: count,
    color: statusColors[status] || 'var(--dt-text-muted)',
  }))

  // Source donut chart data
  const sourceDonutData = sourceStats.sourceRows.slice(0, 8).map((source, index) => ({
    label: source.label,
    value: source.total,
    color: SOURCE_COLORS[source.id] || GOUVERNORAT_COLORS[index % GOUVERNORAT_COLORS.length],
  }))

  // Gouvernorat donut chart data
  const gouvernoratDonutData = gouvernoratStats.gouvernoratRows.slice(0, 8).map((gov, index) => ({
    label: gov.label,
    value: gov.total,
    color: GOUVERNORAT_COLORS[index % GOUVERNORAT_COLORS.length],
  }))

  const stockHealthPercent =
    totalProducts > 0
      ? Math.round((inStockCount / totalProducts) * 100)
      : 0

  const stockPerProduct =
    totalProducts > 0
      ? totalStock / totalProducts
      : 0

  return (
    <div className={`${baseClass} dashboard-stats`}>
      {/* Hero Section */}
      <section className="ph-hero">
        <div className="ph-hero__content">
          <div className="ph-hero__eyebrow">
            <Sparkles size={16} />
            Tableau de bord 
          </div>
          <h2>Vue d&apos;ensemble</h2>
          <p>Pilotage des stocks, des ventes et de la qualité du catalogue en temps réel.</p>
          <div className="ph-hero__chips">
            <span className="ph-chip"><Package size={14} />{formatNumber(totalProducts)} produits</span>
            <span className="ph-chip"><ShoppingCart size={14} />{formatNumber(totalOrders)} commandes</span>
            <span className="ph-chip"><Users size={14} />{formatNumber(activeCustomers)} clients actifs</span>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="dash-kpi-grid">
        <div className="dash-kpi-card"><div className="dash-kpi-icon dash-kpi-icon--purple">📦</div><div><p className="dash-kpi-label">Total Commandes</p><p className="dash-kpi-value">{totalOrders}</p></div></div>
        <div className="dash-kpi-card"><div className="dash-kpi-icon dash-kpi-icon--teal">🛒</div><div><p className="dash-kpi-label">Articles vendus</p><p className="dash-kpi-value">{totalItems}</p></div></div>
      </div>

      {/* Donut Charts Section */}
      <div className="ph-donut-charts-grid">
        {/* Status Donut Chart */}
        {statusDonutData.length > 0 && (
          <DonutChart 
            data={statusDonutData}
            title="Commandes par statut"
            total={totalOrders}
            totalLabel="commandes"
          />
        )}

        {/* Source Donut Chart */}
        {sourceDonutData.length > 0 && (
          <DonutChart 
            data={sourceDonutData}
            title="Commandes par source"
            total={sourceStats.totalSourceOrders}
            totalLabel="commandes"
          />
        )}

        {/* Gouvernorat Donut Chart */}
        {gouvernoratDonutData.length > 0 && (
          <DonutChart 
            data={gouvernoratDonutData}
            title="Commandes par gouvernorat"
            total={gouvernoratStats.totalGouvernoratOrders}
            totalLabel="commandes"
          />
        )}
      </div>
      {/* ============================================ */}
      {/* NEW: STOCK STATISTICS SECTION */}
      {/* ============================================ */}
      {stockStats && (
        <section className="ph-section">
          <SectionTitle 
            icon={Package} 
            title="État des stocks" 
            subtitle={`${formatNumber(stockStats.totalStock)} unités en stock · ${stockStats.totalVariants} variantes`} 
          />
          
          {/* Stock KPIs — only in stock or out of stock */}
          <div className="ph-grid ph-grid--3" style={{ marginBottom: '1.5rem' }}>
            <MetricCard 
              icon={CheckCircle} 
              label="En stock" 
              value={formatNumber(stockStats.inStockCount)} 
              note={`${formatPercent(stockStats.stockHealthPercent)} des produits`} 
              tone="ph-tone-success" 
            />
            <MetricCard 
              icon={XCircle} 
              label="Rupture de stock" 
              value={formatNumber(stockStats.outOfStockCount)} 
              note="Stock = 0" 
              tone="ph-tone-danger" 
            />
            <MetricCard 
              icon={Layers} 
              label="Stock moyen/produit" 
              value={stockStats.averageStockPerProduct} 
              note="Unités par produit" 
              tone="ph-tone-info" 
            />
          </div>

        </section>
      )}

      {/* ============================================ */}
      {/* NEW: ORDER STATISTICS SECTION */}
      {/* ============================================ */}
      {orderStats && (
        <section className="ph-section">
          <SectionTitle 
            icon={BarChart3} 
            title="Statistiques des commandes" 
            subtitle={`Aujourd'hui: ${orderStats.todayOrders} · Cette semaine: ${orderStats.weekOrders} · Ce mois: ${orderStats.monthOrders}`} 
          />
          
          {/* Order KPIs */}
          <div className="ph-grid ph-grid--4" style={{ marginBottom: '1.5rem' }}>
            <MetricCard 
              icon={Calendar} 
              label="Aujourd'hui" 
              value={formatNumber(orderStats.todayOrders)} 
              note={`${orderStats.todayValidated} validées`} 
            />
            <MetricCard 
              icon={Clock} 
              label="Cette semaine" 
              value={formatNumber(orderStats.weekOrders)} 
              note={`${orderStats.weekValidated} validées`} 
              tone="ph-tone-info" 
            />
            <MetricCard 
              icon={Target} 
              label="Ce mois" 
              value={formatNumber(orderStats.monthOrders)} 
              note={`${orderStats.monthValidated} validées`} 
              tone="ph-tone-success" 
            />
            <MetricCard 
              icon={TrendingUp} 
              label="Moyenne/jour" 
              value={orderStats.avgOrdersPerDay} 
              note={`Heure de pointe: ${orderStats.peakHour}h`} 
              tone="ph-tone-purple" 
            />
          </div>

          {/* Orders per day chart (last 7 days) */}
          <div className="ph-orders-trend" style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--dt-text-secondary)', marginBottom: '0.75rem' }}>
              Commandes des 7 derniers jours
            </h4>
            <div className="ph-revenue-trend">
              {orderStats.dailyOrdersLast7Days.map((day, index) => {
                const maxCount = Math.max(...orderStats.dailyOrdersLast7Days.map(d => d.count), 1)
                const height = (day.count / maxCount) * 100
                return (
                  <div key={day.date} className="ph-revenue-trend__bar">
                    <div className="ph-revenue-trend__bar-value">
                      {day.count}
                    </div>
                    <div 
                      className="ph-revenue-trend__bar-fill"
                      style={{ 
                        height: `${height}%`,
                        background: index === orderStats.dailyOrdersLast7Days.length - 1 
                          ? 'linear-gradient(180deg, var(--dt-accent), var(--dt-purple))' 
                          : 'linear-gradient(180deg, var(--dt-border), var(--dt-border-strong))'
                      }}
                    />
                    <div className="ph-revenue-trend__bar-label">{day.dayName}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}


      {/* Categories Section */}
      {categoryStats && categoryStats.topCategories.length > 0 && (
        <section className="ph-section">
          <SectionTitle icon={Tags} title="Catégories les plus commandées" subtitle={`Top ${categoryStats.topCategories.length} par nombre de commandes`} />
          <div className="ph-grid ph-grid--3" style={{ marginBottom: '1.5rem' }}>
            <MetricCard icon={Tags} label="Catégories actives" value={formatNumber(categoryStats.categoryCount)} note="Avec ventes ou produits" />
            <MetricCard icon={ShoppingCart} label="Articles vendus" value={formatNumber(categoryStats.totalCategorySold)} note="Toutes catégories" tone="ph-tone-success" />
          </div>
          <div className="ph-top-list">
            {categoryStats.topCategories.map((category) => (
              <article key={category.id} className="ph-top-item">
                <div className="ph-top-item__rank">{category.rank}</div>
                <div className="ph-top-item__content">
                  <div className="ph-top-item__head">
                    <div>
                      <span className="ph-top-item__title">{category.name}</span>
                      <div className="ph-top-item__sub">
                        <strong>{category.orderCount} commandes</strong> · {formatNumber(category.totalSold)} articles · {category.productCount} produits
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--dt-text-secondary)' }}>{category.orderShare}%</span>
                    </div>
                  </div>
                  <div className="ph-top-item__bar">
                    <div className="ph-top-item__bar-track">
                      <div className="ph-top-item__bar-fill" style={{ width: `${category.share}%` }} />
                    </div>
                    <div className="ph-top-item__bar-meta">
                      <span>{category.share}% du top</span>
                      <span>{formatNumber(category.totalSold)} articles</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Status Breakdown */}
      {Object.keys(byStatus).length > 0 && (
        <div className="dash-section">
          <h2 className="dash-section-title">Statut des commandes</h2>
          <div className="dash-status-grid">
            {Object.entries(byStatus).map(([status, count]) => (
              <div key={status} className="dash-status-badge" style={{ borderColor: statusColors[status] || 'var(--dt-border-strong)' }}>
                <span className="dash-status-dot" style={{ background: statusColors[status] || 'var(--dt-text-muted)' }} />
                <span className="dash-status-label">{statusLabels[status] || status}</span>
                <span className="dash-status-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default BeforeDashboard