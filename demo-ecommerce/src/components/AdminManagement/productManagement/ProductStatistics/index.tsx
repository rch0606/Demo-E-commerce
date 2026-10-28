'use client'

import React, { useEffect, useState } from 'react'
import {
  ArrowDownToLine,
  Boxes,
  Package,
} from 'lucide-react'
import { useListQuery } from '@payloadcms/ui'
import type { Where } from 'payload'
import './index.css'

interface BeforeListProps {
  collection?: {
    slug: string
    labels: {
      singular: string
      plural: string
    }
  }
}

interface TopProduct {
  rank: number
  id: string
  title: string
  sales: number
  revenue: number
  stock: number
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock'
  share: number
}

interface Movement {
  id: string
  movementType: string
  productTitle: string
  variantTitle?: string | null
  quantity: number
  beforeStock: number
  afterStock: number
  direction: 'in' | 'out' | 'neutral'
  createdAt: string | null
}

interface ProductHealth {
  totalProducts: number
  publishedCount: number
  draftCount: number
  inStockCount: number
  lowStockCount: number
  outOfStockCount: number
  inStockIds: string[]
  outOfStockIds: string[]
  totalStock: number
  stockValue: number
  totalOrders: number
  ordersToday: number
  ordersWeek: number
  ordersMonth: number
  revenueToday: number
  revenueWeek: number
  revenueMonth: number
  averageOrder: number
  activeCustomers: number
  inventoryMovementsToday: number
  inventoryMovementsWeek: number
  inventoryEntriesToday: number
  inventoryExitsToday: number
  lastMovement: Movement | null
  recentMovements: Movement[]
  topProducts: TopProduct[]
  productsWithoutImage: number
  productsWithoutCategory: number
  productsWithoutDescription: number
  incompleteProducts: number
  newToday: number
  newThisWeek: number
  newThisMonth: number
}

const EMPTY_HEALTH: ProductHealth = {
  totalProducts: 0,
  publishedCount: 0,
  draftCount: 0,
  inStockCount: 0,
  lowStockCount: 0,
  outOfStockCount: 0,
  inStockIds: [],
  outOfStockIds: [],
  totalStock: 0,
  stockValue: 0,
  totalOrders: 0,
  ordersToday: 0,
  ordersWeek: 0,
  ordersMonth: 0,
  revenueToday: 0,
  revenueWeek: 0,
  revenueMonth: 0,
  averageOrder: 0,
  activeCustomers: 0,
  inventoryMovementsToday: 0,
  inventoryMovementsWeek: 0,
  inventoryEntriesToday: 0,
  inventoryExitsToday: 0,
  lastMovement: null,
  recentMovements: [],
  topProducts: [],
  productsWithoutImage: 0,
  productsWithoutCategory: 0,
  productsWithoutDescription: 0,
  incompleteProducts: 0,
  newToday: 0,
  newThisWeek: 0,
  newThisMonth: 0,
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'TND',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatCurrencyCompact(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'TND',
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(value || 0))
}

function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value || 0)))}%`
}

function formatDateTime(value: string | null) {
  if (!value) return '-'

  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getMovementLabel(type: string) {
  const labels: Record<string, string> = {
    stock_entry: 'Entrée de stock',
    stock_exit: 'Sortie de stock',
    order_deduct: 'Sortie de commande',
    order_restore: 'Retour commande',
    manual_adjustment: 'Ajustement manuel',
    variant_recalc: 'Recalcul variante',
    customer_return: 'Retour client',
  }

  return labels[type] || type
}

function getMovementTone(direction: Movement['direction']) {
  if (direction === 'in') return 'ph-tone-success'
  if (direction === 'out') return 'ph-tone-danger'
  return 'ph-tone-neutral'
}

type StockFilter = 'all' | 'in_stock' | 'out_of_stock'

function MetricCard({
  icon: Icon,
  label,
  value,
  note,
  percent,
  tone = 'ph-tone-default',
  active = false,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  note?: string
  percent?: string
  tone?: string
  active?: boolean
  onClick?: () => void
}) {
  const isClickable = typeof onClick === 'function'

  return (
    <article
      className={`ph-metric-card ${tone}${active ? ' is-active' : ''}${isClickable ? ' is-clickable' : ''}`}
      onClick={onClick}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-pressed={isClickable ? active : undefined}
    >
      <div className="ph-metric-card__icon">
        <Icon className="ph-metric-card__icon-svg" />
      </div>
      <div className="ph-metric-card__body">
        <div className="ph-metric-card__header">
          <span className="ph-metric-card__label">{label}</span>
          {percent && <span className="ph-metric-card__percent">{percent}</span>}
        </div>
        <div className="ph-metric-card__value">{value}</div>
        {note && <div className="ph-metric-card__note">{note}</div>}
      </div>
    </article>
  )
}

function getActiveStockFilter(where: Where | undefined): StockFilter {
  if (!where) return 'all'

  // Payload may wrap conditions in `and`
  const conditions = Array.isArray((where as any).and) ? (where as any).and : [where]

  for (const condition of conditions) {
    if (!condition || typeof condition !== 'object') continue

    const stock = (condition as any).totalStock
    if (stock && typeof stock === 'object') {
      if (stock.equals === 0 || stock.equals === '0') return 'out_of_stock'
      if (typeof stock.greater_than === 'number' && stock.greater_than >= 0) return 'in_stock'
      if (typeof stock.greater_than_equal === 'number' && stock.greater_than_equal >= 1) return 'in_stock'
    }

    // Filtre par id.in (utilisé après le fix product-health)
    const idFilter = (condition as any).id
    if (idFilter && typeof idFilter === 'object') {
      if (idFilter.equals === '__no_out_of_stock__') return 'out_of_stock'
      if (idFilter.equals === '__no_in_stock__') return 'in_stock'
      // id.in : on ne peut pas savoir in vs out sans state local
    }
  }

  return 'all'
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: string
}) {
  return (
    <div className="ph-section-head">
      <div className="ph-section-head__title">
        <Icon className="ph-section-head__icon" />
        <h3>{title}</h3>
      </div>
      {subtitle && <p className="ph-section-head__subtitle">{subtitle}</p>}
    </div>
  )
}

export default function ProductStatistics(props: BeforeListProps) {
  const [health, setHealth] = useState<ProductHealth>(EMPTY_HEALTH)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<StockFilter>('all')
  const { query, handleWhereChange } = useListQuery()

  useEffect(() => {
    const fromQuery = getActiveStockFilter(query?.where as Where | undefined)
    if (fromQuery === 'all' && !query?.where) {
      setActiveFilter('all')
    }
  }, [query?.where])

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/product-health')
        const data = await response.json()

        setHealth({
          totalProducts: data.totalProducts || 0,
          publishedCount: data.publishedCount || 0,
          draftCount: data.draftCount || 0,
          inStockCount: data.inStockCount || 0,
          lowStockCount: data.lowStockCount || 0,
          outOfStockCount: data.outOfStockCount || 0,
          inStockIds: Array.isArray(data.inStockIds) ? data.inStockIds.map(String) : [],
          outOfStockIds: Array.isArray(data.outOfStockIds) ? data.outOfStockIds.map(String) : [],
          totalStock: data.totalStock || 0,
          stockValue: data.stockValue || 0,
          totalOrders: data.totalOrders || 0,
          ordersToday: data.ordersToday || 0,
          ordersWeek: data.ordersWeek || 0,
          ordersMonth: data.ordersMonth || 0,
          revenueToday: data.revenueToday || 0,
          revenueWeek: data.revenueWeek || 0,
          revenueMonth: data.revenueMonth || 0,
          averageOrder: data.averageOrder || 0,
          activeCustomers: data.activeCustomers || 0,
          inventoryMovementsToday: data.inventoryMovementsToday || 0,
          inventoryMovementsWeek: data.inventoryMovementsWeek || 0,
          inventoryEntriesToday: data.inventoryEntriesToday || 0,
          inventoryExitsToday: data.inventoryExitsToday || 0,
          lastMovement: data.lastMovement || null,
          recentMovements: data.recentMovements || [],
          topProducts: data.topProducts || [],
          productsWithoutImage: data.productsWithoutImage || 0,
          productsWithoutCategory: data.productsWithoutCategory || 0,
          productsWithoutDescription: data.productsWithoutDescription || 0,
          incompleteProducts: data.incompleteProducts || 0,
          newToday: data.newToday || 0,
          newThisWeek: data.newThisWeek || 0,
          newThisMonth: data.newThisMonth || 0,
        })
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques produits:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHealth()
  }, [])

  const applyStockFilter = (filter: StockFilter) => {
  if (!handleWhereChange) return

  setActiveFilter(filter)

  if (filter === 'all') {
    handleWhereChange({})
    return
  }

  if (filter === 'in_stock') {
    handleWhereChange({
      totalStock: {
        greater_than: 0,
      },
    })
    return
  }

  if (filter === 'out_of_stock') {
    handleWhereChange({
      totalStock: {
        equals: 0,
      },
    })
  }
}

  const stockHealthPercent =
    health.totalProducts > 0 ? Math.round((health.inStockCount / health.totalProducts) * 100) : 0
  const outOfStockPercent =
    health.totalProducts > 0 ? Math.round((health.outOfStockCount / health.totalProducts) * 100) : 0

  if (loading) {
    return (
      <div className="ph-dashboard">
        <div className="ph-loading-shell">
          <div className="ph-loading-spinner" />
          <div className="ph-loading-title">Chargement des statistiques...</div>
          <div className="ph-loading-copy">Mise à jour du tableau de bord produit en cours.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="ph-dashboard">
      <section className="ph-section">
        <SectionTitle
          icon={Package}
          title="Produits"
          subtitle="Cliquez sur une carte pour filtrer la liste (Tous / En stock / Rupture)"
        />

        <div className="ph-grid ph-grid--3">
          <MetricCard
            icon={Package}
            label="Tous"
            value={formatNumber(health.totalProducts)}
            percent={formatPercent(100)}
            note="Afficher tous les produits"
            active={activeFilter === 'all'}
            onClick={() => applyStockFilter('all')}
          />
          <MetricCard
            icon={Boxes}
            label="En stock"
            value={formatNumber(health.inStockCount)}
            percent={formatPercent(stockHealthPercent)}
            note="totalStock > 0"
            tone="ph-tone-success"
            active={activeFilter === 'in_stock'}
            onClick={() => applyStockFilter('in_stock')}
          />
          <MetricCard
            icon={ArrowDownToLine}
            label="Rupture de stock"
            value={formatNumber(health.outOfStockCount)}
            percent={formatPercent(outOfStockPercent)}
            note="totalStock = 0 · Épuisé"
            tone="ph-tone-danger"
            active={activeFilter === 'out_of_stock'}
            onClick={() => applyStockFilter('out_of_stock')}
          />
        </div>
      </section>
    </div>
  )
}
