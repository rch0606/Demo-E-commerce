'use client'

import React, { useEffect, useState } from 'react'
import {
  ShoppingCart,
  CircleDollarSign,
  ArrowUpRight,
  Users,
  CalendarDays,
  TrendingUp,
} from 'lucide-react'
import './index.css'

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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'TND',
    maximumFractionDigits: 0,
  }).format(amount)
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

export default function OrderStatistics() {
  const [stats, setStats] = useState<OrderStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)

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
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="os-dashboard">
        <div className="os-loading">Chargement des statistiques de commandes...</div>
      </div>
    )
  }

  return (
    <div className="os-dashboard">
      <section className="os-section">
        <div className="os-section-header">
          <h2 className="os-section-title">
            <ShoppingCart size={18} />
            Commandes
          </h2>
          <span className="os-section-subtitle">
            Les KPI que le commerçant regarde en premier
          </span>
        </div>

        <div className="os-kpi-grid">
          <div className="os-kpi">
            <div className="os-kpi-icon">
              <ShoppingCart size={20} />
            </div>
            <div className="os-kpi-content">
              <div className="os-kpi-value">{formatNumber(stats.ordersToday)}</div>
              <div className="os-kpi-label">Commandes aujourd'hui</div>
              <div className="os-kpi-note">Commandes créées sur la journée</div>
            </div>
          </div>

          <div className="os-kpi">
            <div className="os-kpi-icon">
              <CalendarDays size={20} />
            </div>
            <div className="os-kpi-content">
              <div className="os-kpi-value">{formatNumber(stats.ordersWeek)}</div>
              <div className="os-kpi-label">Commandes cette semaine</div>
              <div className="os-kpi-note">Flux des 7 derniers jours</div>
            </div>
          </div>

          <div className="os-kpi">
            <div className="os-kpi-icon">
              <CalendarDays size={20} />
            </div>
            <div className="os-kpi-content">
              <div className="os-kpi-value">{formatNumber(stats.ordersMonth)}</div>
              <div className="os-kpi-label">Commandes ce mois</div>
              <div className="os-kpi-note">Volume commercial sur 30 jours</div>
            </div>
          </div>

          <div className="os-kpi os-kpi-success">
            <div className="os-kpi-icon">
              <CircleDollarSign size={20} />
            </div>
            {/* <div className="os-kpi-content">
              <div className="os-kpi-value">{formatCurrencyCompact(stats.revenueMonth)}</div>
              <div className="os-kpi-label">Chiffre d'affaires</div>
              <div className="os-kpi-note">Aujourd'hui: {formatCurrencyCompact(stats.revenueToday)}</div>
            </div> */}
          </div>

          <div className="os-kpi os-kpi-info">
            <div className="os-kpi-icon">
              <ArrowUpRight size={20} />
            </div>
            <div className="os-kpi-content">
              <div className="os-kpi-value">{formatCurrencyCompact(stats.averageOrder)}</div>
              {/* <div className="os-kpi-label">Panier moyen</div> */}
              <div className="os-kpi-note">Valeur moyenne d'une commande</div>
            </div>
          </div>

          <div className="os-kpi">
            <div className="os-kpi-icon">
              <Users size={20} />
            </div>
            <div className="os-kpi-content">
              <div className="os-kpi-value">{formatNumber(stats.activeCustomers)}</div>
              <div className="os-kpi-label">Clients actifs</div>
              <div className="os-kpi-note">Clients uniques sur 30 jours</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}