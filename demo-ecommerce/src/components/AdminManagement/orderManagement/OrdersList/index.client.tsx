'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { Order } from '@/payload-types'
import CreateOrderButton from '../CreateOrderButton'
import {
  ShoppingCart,
  CircleDollarSign,
  ArrowUpRight,
  Users,
  CalendarDays,
  Plus,
  Trash2,
} from 'lucide-react'
import './index.css'

interface OrdersListProps {
  initialOrders?: {
    docs: Order[]
    totalDocs: number
    totalPages: number
    page: number
  }
}

interface OrderStats {
  totalOrders: number
  ordersToday: number
  ordersWeek: number
  ordersMonth: number
  revenueToday: number
  revenueWeek: number
  revenueMonth: number
  averageOrder: number
  activeCustomers: number
}

const EMPTY_STATS: OrderStats = {
  totalOrders: 0,
  ordersToday: 0,
  ordersWeek: 0,
  ordersMonth: 0,
  revenueToday: 0,
  revenueWeek: 0,
  revenueMonth: 0,
  averageOrder: 0,
  activeCustomers: 0,
}

function formatCurrencyCompact(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'TND',
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(value || 0))
}

export default function OrdersListClient({ initialOrders }: OrdersListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const safeInitialOrders = initialOrders || {
    docs: [],
    totalDocs: 0,
    totalPages: 1,
    page: 1,
  }

  const orders = safeInitialOrders.docs
  const currentPage = safeInitialOrders.page
  const totalPages = safeInitialOrders.totalPages
  const totalDocs = safeInitialOrders.totalDocs
  const limit = 12

  // Read values directly from URL
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const source = searchParams.get('source') || ''
  const sort = searchParams.get('sort') || '-createdAt'

  // Local state
  const [searchValue, setSearchValue] = useState(search)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Order statistics state
  const [stats, setStats] = useState<OrderStats>(EMPTY_STATS)
  const [statsLoading, setStatsLoading] = useState(true)

  // Fetch order statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/order-stats')
        const data = await response.json()
        setStats({
          totalOrders: data.totalOrders || 0,
          ordersToday: data.ordersToday || 0,
          ordersWeek: data.ordersWeek || 0,
          ordersMonth: data.ordersMonth || 0,
          revenueToday: data.revenueToday || 0,
          revenueWeek: data.revenueWeek || 0,
          revenueMonth: data.revenueMonth || 0,
          averageOrder: data.averageOrder || 0,
          activeCustomers: data.activeCustomers || 0,
        })
      } catch (error) {
        console.error('Error fetching order stats:', error)
      } finally {
        setStatsLoading(false)
      }
    }
    fetchStats()
  }, [])


  const updateFilters = useCallback((updates: Record<string, string | number>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, String(value))
      } else {
        params.delete(key)
      }
    })

    const url = `${pathname}?${params.toString()}`
    
    startTransition(() => {
      router.push(url, { scroll: false })
    })
  }, [pathname, router, searchParams])

  useEffect(() => {
    setSearchValue(search)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== search) {
        updateFilters({ search: searchValue, page: 1 })
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchValue, search, updateFilters])

  useEffect(() => {
    setSelectedOrders([])
  }, [search, status, source, sort, currentPage])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value)
  }

  const handleClearSearch = () => {
    setSearchValue('')
    updateFilters({ search: '', page: 1 })
  }

  const handleStatusChange = (value: string) => {
    updateFilters({ status: value, page: 1 })
  }

  const handleSourceChange = (value: string) => {
    updateFilters({ source: value, page: 1 })
  }

  const handleSortChange = (value: string) => {
    updateFilters({ sort: value, page: 1 })
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updateFilters({ page: newPage })
    }
  }

  const toggleOrder = (id: string) => {
    setSelectedOrders(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    )
  }

  const handleBulkDelete = async () => {
    if (selectedOrders.length === 0) return

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedOrders.length} commande(s) ?`)) {
      return
    }

    setIsDeleting(true)
    try {
      await Promise.all(
        selectedOrders.map(id =>
          fetch(`/api/orders/${id}`, { method: 'DELETE' })
        )
      )

      setSelectedOrders([])
      router.refresh()
    } catch (error) {
      console.error('Error deleting orders:', error)
      alert('Erreur lors de la suppression des commandes')
    } finally {
      setIsDeleting(false)
    }
  }

  // Edit is only on the order detail page (no bulk Modifier)

  const normalizeStatus = (status?: string | null) => {
    const allowedStatuses = new Set(['new', 'validated', 'cancelled', 'returned'])
    const normalizedStatus = status || 'new'
    return allowedStatuses.has(normalizedStatus) ? normalizedStatus : 'new'
  }

  const getStatusLabel = (status?: string | null) => {
    const normalizedStatus = normalizeStatus(status)
    const map: Record<string, string> = {
      new: 'Nouvelle',
      validated: 'Validée',
      cancelled: 'Annulée',
      returned: 'Retournée',
    }
    return map[normalizedStatus] || normalizedStatus
  }

  const getStatusClass = (status?: string | null) => {
    const normalizedStatus = normalizeStatus(status)
    const map: Record<string, string> = {
      new: 'status-new',
      validated: 'status-validated',
      cancelled: 'status-cancelled',
      returned: 'status-returned',
    }
    return map[normalizedStatus] || ''
  }

  const getSourceLabel = (source?: string | null) => {
    const map: Record<string, string> = {
      website: 'Site Web',
      instagram: 'Instagram',
      facebook: 'Facebook',
      whatsapp: 'WhatsApp',
      boutique: 'Boutique',
    }
    return map[source || ''] || source || ''
  }

  return (
    <div className="orders-list-wrapper">
      {/* Header with Create Order Button */}
      <div className="orders-list-header">
        <div className="orders-list-header-left">
          <h1 className="orders-list-title">Commandes</h1>
          <span className="orders-list-count">
            {totalDocs} commande{totalDocs !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="orders-list-header-right">
          <CreateOrderButton />
        </div>
      </div>

      {/* Order Statistics KPI Cards */}
      <div className="orders-stats-grid">
        <div className="orders-stat-card">
          <div className="orders-stat-icon"><ShoppingCart size={20} /></div>

          <div className="orders-stat-content">
            <div className="orders-stat-value">
              {statsLoading ? '...' : formatNumber(stats.ordersToday)}
            </div>
            <div className="orders-stat-label">Commandes aujourd'hui</div>
            <div className="orders-stat-note">Créées sur la journée</div>
          </div>
        </div>

        <div className="orders-stat-card">
          <div className="orders-stat-icon">
            <CalendarDays size={20} />
          </div>
          <div className="orders-stat-content">
            <div className="orders-stat-value">
              {statsLoading ? '...' : formatNumber(stats.ordersWeek)}
            </div>
            <div className="orders-stat-label">Cette semaine</div>
            <div className="orders-stat-note">Flux des 7 derniers jours</div>
          </div>
        </div>

        <div className="orders-stat-card">
          <div className="orders-stat-icon">
            <CalendarDays size={20} />
          </div>
          <div className="orders-stat-content">
            <div className="orders-stat-value">
              {statsLoading ? '...' : formatNumber(stats.ordersMonth)}
            </div>
            <div className="orders-stat-label">Ce mois</div>
            <div className="orders-stat-note">Volume sur 30 jours</div>
          </div>
        </div>

        {/* <div className="orders-stat-card orders-stat-success">
          <div className="orders-stat-icon">
            <CircleDollarSign size={20} />
          </div>
          <div className="orders-stat-content">
            <div className="orders-stat-value">
              {statsLoading ? '...' : formatCurrencyCompact(stats.revenueMonth)}
            </div>
            <div className="orders-stat-label">Chiffre d'affaires</div>
            <div className="orders-stat-note">
              Aujourd'hui: {statsLoading ? '...' : formatCurrencyCompact(stats.revenueToday)}
            </div>
          </div>
        </div> */}

        {/* <div className="orders-stat-card orders-stat-info">
          <div className="orders-stat-icon">
            <ArrowUpRight size={20} />
          </div>
          <div className="orders-stat-content">
            <div className="orders-stat-value">
              {statsLoading ? '...' : formatCurrencyCompact(stats.averageOrder)}
            </div>
            <div className="orders-stat-label">Panier moyen</div>
            <div className="orders-stat-note">Valeur moyenne par commande</div>
          </div>
        </div> */}

      </div>

      {/* Search and Filters */}
      <div className="orders-filters-container">
        <div className="orders-filters-row">
          <div className="orders-search-wrapper">
            <div className="orders-search-input-wrapper">
              <input
                type="text"
                placeholder="🔍 Rechercher..."
                value={searchValue}
                onChange={handleSearchChange}
                className="orders-search-input"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="orders-search-clear"
                  aria-label="Effacer la recherche"
                >
                  ✕
                </button>
              )}
              {isPending && (
                <span className="orders-search-spinner">⟳</span>
              )}
            </div>
          </div>

          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="orders-filter-select"
          >
            <option value="">Statut</option>
            <option value="new">Nouvelle</option>
            <option value="validated">Validée</option>
            <option value="cancelled">Annulée</option>
            <option value="returned">Retournée</option>
          </select>

          <select
            value={source}
            onChange={(e) => handleSourceChange(e.target.value)}
            className="orders-filter-select"
          >
            <option value="">Source</option>
            <option value="website">Site Web</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="boutique">Boutique</option>
          </select>

          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="orders-filter-select"
          >
            <option value="-createdAt">Date (récent → ancien)</option>
            <option value="createdAt">Date (ancien → récent)</option>
            <option value="-totalAmount">Total (plus élevé)</option>
            <option value="totalAmount">Total (plus bas)</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Toolbar — delete only (edit is on the order page) */}
      {selectedOrders.length > 0 && (
        <div className="orders-toolbar">
          <span className="orders-toolbar-count">
            {selectedOrders.length} commande
            {selectedOrders.length > 1 ? 's' : ''} sélectionnée
            {selectedOrders.length > 1 ? 's' : ''}
          </span>
          <div className="orders-toolbar-actions">
            <button
              type="button"
              className="orders-toolbar-btn orders-toolbar-btn-delete"
              onClick={handleBulkDelete}
              disabled={isDeleting}
              aria-label="Supprimer la sélection"
            >
              <Trash2 size={16} strokeWidth={2} />
              {isDeleting ? 'Suppression…' : 'Supprimer'}
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th className="orders-checkbox-cell"></th>
              <th>Référence</th>
              <th>Client</th>
              <th>Téléphone</th>
              <th>Gouvernorat</th>
              <th>Source</th>
              <th>Statut</th>
              <th>Total</th>
              <th>Date / Heure</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="orders-empty-state">
                  {isPending ? 'Recherche en cours...' : 'Aucune commande trouvée'}
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className={`orders-table-row ${selectedOrders.includes(order.id) ? 'selected' : ''}`}
                  onClick={() => router.push(`/admin/collections/orders/${order.id}`)}
                >
                  <td className="orders-checkbox-cell" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => toggleOrder(order.id)}
                      className="orders-checkbox"
                    />
                  </td>
                  <td className="orders-cell-reference">
                    <strong>{order.orderNumber || '-'}</strong>
                  </td>
                  <td>{order.customerName || '-'}</td>
                  <td>{order.customerPhone || '-'}</td>
                  <td>{order.customerGouvernorat || '-'}</td>
                  <td>
                    <span className="source-badge">{getSourceLabel(order.source)}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="orders-cell-amount">
                    <strong>{order.totalAmount?.toFixed(2) || '0.00'} DT</strong>
                  </td>
                  <td className="orders-cell-date">
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Africa/Tunis',
                        })
                      : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalDocs > 0 && (
          <div className="orders-table-footer">
            <div className="orders-pagination-info">
              <span>
                Affichage de {((currentPage - 1) * limit) + 1} à{' '}
                {Math.min(currentPage * limit, totalDocs)} sur {totalDocs} commandes
              </span>
            </div>
            <div className="orders-pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                ← Précédent
              </button>
              <span className="pagination-current">
                Page {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}