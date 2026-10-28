// app/api/order-stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

/** Map DB source values to French labels */
const SOURCE_LABELS: Record<string, string> = {
  website: 'Site Web',
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  boutique: 'Boutique',
}

function toDateKey(d: Date): string {
  // Local YYYY-MM-DD (avoids UTC shift issues for Tunisia UTC+1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Monday 00:00 of the week containing `d` (ISO-style week, Monday start) */
function getMonday(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = date.getDay() // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date
}

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Chiffre d'affaires : réservé à l'équipe connectée.
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)

    // Calendar week (Monday–Sunday)
    const thisWeekStart = getMonday(todayStart)
    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    const lastWeekEnd = thisWeekStart

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = monthStart

    const yearStart = new Date(now.getFullYear(), 0, 1)
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
    const lastYearEnd = yearStart

    // Fetch all orders (pagination loop so we never miss data beyond 10k)
    const allOrders: Array<{
      createdAt: string
      totalAmount?: number | null
      status?: string | null
      source?: string | null
      customerPhone?: string | null
    }> = []

    let page = 1
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const result = await payload.find({
        collection: 'orders',
        limit: pageSize,
        page,
        depth: 0,
        sort: '-createdAt',
      })
      allOrders.push(...(result.docs as typeof allOrders))
      hasMore = result.hasNextPage
      page++
      // Safety cap
      if (page > 100) break
    }

    // Counters
    let ordersToday = 0
    let ordersYesterday = 0
    let ordersWeek = 0
    let ordersLastWeek = 0
    let ordersMonth = 0
    let ordersLastMonth = 0
    let ordersYear = 0
    let ordersLastYear = 0

    let revenueToday = 0
    let revenueYesterday = 0
    let revenueWeek = 0
    let revenueLastWeek = 0
    let revenueMonth = 0
    let revenueLastMonth = 0
    let revenueYear = 0
    let revenueLastYear = 0

    const customerSetToday = new Set<string>()
    const customerSetWeek = new Set<string>()
    const customerSetMonth = new Set<string>()

    // Full-history buckets for charts (not limited to 30 days)
    const dailyTracking: Record<string, { revenue: number; orders: number }> = {}
    const weeklyTracking: Record<string, { revenue: number; orders: number; weekStart: Date }> = {}
    const monthlyTracking: Record<string, { revenue: number; orders: number; monthDate: Date }> = {}
    const sourceTracking: Record<string, { revenue: number; orders: number }> = {}

    // Pre-fill last 30 days so empty days appear on the chart
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayStart)
      d.setDate(d.getDate() - i)
      dailyTracking[toDateKey(d)] = { revenue: 0, orders: 0 }
    }

    // Pre-fill last 12 calendar months
    for (let i = 11; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`
      monthlyTracking[key] = { revenue: 0, orders: 0, monthDate: m }
    }

    // Pre-fill last 12 calendar weeks (Monday starts)
    for (let i = 11; i >= 0; i--) {
      const monday = new Date(thisWeekStart)
      monday.setDate(monday.getDate() - i * 7)
      const key = toDateKey(monday)
      weeklyTracking[key] = { revenue: 0, orders: 0, weekStart: monday }
    }

    for (const order of allOrders) {
      const status = order.status || 'new'
      // CA excludes cancelled & returned
      if (status === 'cancelled' || status === 'returned') continue

      const orderDate = new Date(order.createdAt)
      const amount = Number(order.totalAmount) || 0
      const sourceKey = order.source || 'website'
      const sourceLabel = SOURCE_LABELS[sourceKey] || sourceKey
      const phone = order.customerPhone || ''

      // --- Period counters ---
      if (orderDate >= todayStart) {
        ordersToday++
        revenueToday += amount
        if (phone) customerSetToday.add(phone)
      }

      if (orderDate >= yesterdayStart && orderDate < todayStart) {
        ordersYesterday++
        revenueYesterday += amount
      }

      if (orderDate >= thisWeekStart) {
        ordersWeek++
        revenueWeek += amount
        if (phone) customerSetWeek.add(phone)
      }

      if (orderDate >= lastWeekStart && orderDate < lastWeekEnd) {
        ordersLastWeek++
        revenueLastWeek += amount
      }

      if (orderDate >= monthStart) {
        ordersMonth++
        revenueMonth += amount
        if (phone) customerSetMonth.add(phone)

        if (!sourceTracking[sourceLabel]) {
          sourceTracking[sourceLabel] = { revenue: 0, orders: 0 }
        }
        sourceTracking[sourceLabel].revenue += amount
        sourceTracking[sourceLabel].orders++
      }

      if (orderDate >= lastMonthStart && orderDate < lastMonthEnd) {
        ordersLastMonth++
        revenueLastMonth += amount
      }

      if (orderDate >= yearStart) {
        ordersYear++
        revenueYear += amount
      }

      if (orderDate >= lastYearStart && orderDate < lastYearEnd) {
        ordersLastYear++
        revenueLastYear += amount
      }

      // --- Chart buckets (full history where relevant) ---
      const dateKey = toDateKey(orderDate)
      if (!dailyTracking[dateKey]) {
        dailyTracking[dateKey] = { revenue: 0, orders: 0 }
      }
      dailyTracking[dateKey].revenue += amount
      dailyTracking[dateKey].orders++

      const monday = getMonday(orderDate)
      const weekKey = toDateKey(monday)
      if (!weeklyTracking[weekKey]) {
        weeklyTracking[weekKey] = { revenue: 0, orders: 0, weekStart: monday }
      }
      weeklyTracking[weekKey].revenue += amount
      weeklyTracking[weekKey].orders++

      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyTracking[monthKey]) {
        monthlyTracking[monthKey] = {
          revenue: 0,
          orders: 0,
          monthDate: new Date(orderDate.getFullYear(), orderDate.getMonth(), 1),
        }
      }
      monthlyTracking[monthKey].revenue += amount
      monthlyTracking[monthKey].orders++
    }

    // Averages
    const averageOrderToday = ordersToday > 0 ? revenueToday / ordersToday : 0
    const averageOrderWeek = ordersWeek > 0 ? revenueWeek / ordersWeek : 0
    const averageOrderMonth = ordersMonth > 0 ? revenueMonth / ordersMonth : 0

    // Daily series = last 30 days only (for the daily chart)
    const dailyRevenue = Object.entries(dailyTracking)
      .map(([date, data]) => ({ date, revenue: data.revenue, orders: data.orders }))
      .filter((d) => {
        const dt = new Date(d.date + 'T00:00:00')
        const cutoff = new Date(todayStart)
        cutoff.setDate(cutoff.getDate() - 29)
        return dt >= cutoff && dt <= todayStart
      })
      .sort((a, b) => a.date.localeCompare(b.date))

    // Weekly series = last 12 weeks
    const weeklyRevenue = Object.values(weeklyTracking)
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
      .slice(-12)
      .map((w) => ({
        week: `Sem. ${w.weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`,
        revenue: w.revenue,
        orders: w.orders,
      }))

    // Monthly series = last 12 months
    const monthlyRevenue = Object.values(monthlyTracking)
      .sort((a, b) => a.monthDate.getTime() - b.monthDate.getTime())
      .slice(-12)
      .map((m) => ({
        month: m.monthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        revenue: m.revenue,
        orders: m.orders,
      }))

    // Source breakdown (this month)
    const totalSourceRevenue = Object.values(sourceTracking).reduce((s, x) => s + x.revenue, 0)
    const bySource = Object.entries(sourceTracking)
      .map(([source, data]) => ({
        source,
        revenue: data.revenue,
        orders: data.orders,
        percentage: totalSourceRevenue > 0 ? Math.round((data.revenue / totalSourceRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    // Top 5 days (from last 30 days chart data)
    const topDays = [...dailyRevenue]
      .filter((d) => d.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    return NextResponse.json({
      totalOrders: allOrders.length,

      ordersToday,
      ordersYesterday,
      ordersWeek,
      ordersLastWeek,
      ordersMonth,
      ordersLastMonth,
      ordersYear,
      ordersLastYear,

      revenueToday,
      revenueYesterday,
      revenueWeek,
      revenueLastWeek,
      revenueMonth,
      revenueLastMonth,
      revenueYear,
      revenueLastYear,

      averageOrderToday,
      averageOrderWeek,
      averageOrderMonth,
      averageOrder: averageOrderMonth,

      activeCustomersToday: customerSetToday.size,
      activeCustomersWeek: customerSetWeek.size,
      activeCustomersMonth: customerSetMonth.size,
      activeCustomers: customerSetMonth.size,

      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,

      bySource,
      topDays,

      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Order Stats Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order statistics' },
      { status: 500 },
    )
  }
}
