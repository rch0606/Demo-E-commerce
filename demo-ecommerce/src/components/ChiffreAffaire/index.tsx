'use client'

import { useEffect, useState } from 'react'
import { 
  CircleDollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  BarChart3,
  PieChart,
  Users,
  RefreshCw,
  Wallet
} from 'lucide-react'
import './index.css'

// Types
type RevenueStats = {
  ordersToday: number
  ordersYesterday: number
  ordersWeek: number
  ordersLastWeek: number
  ordersMonth: number
  ordersLastMonth: number
  ordersYear: number
  ordersLastYear: number
  revenueToday: number
  revenueYesterday: number
  revenueWeek: number
  revenueLastWeek: number
  revenueMonth: number
  revenueLastMonth: number
  revenueYear: number
  revenueLastYear: number
  averageOrderToday: number
  averageOrderWeek: number
  averageOrderMonth: number
  averageOrder: number
  activeCustomersToday: number
  activeCustomersWeek: number
  activeCustomersMonth: number
  activeCustomers: number
  dailyRevenue: Array<{
    date: string
    revenue: number
    orders: number
  }>
  weeklyRevenue: Array<{
    week: string
    revenue: number
    orders: number
  }>
  monthlyRevenue: Array<{
    month: string
    revenue: number
    orders: number
  }>
  bySource: Array<{
    source: string
    revenue: number
    orders: number
    percentage: number
  }>
  topDays: Array<{
    date: string
    revenue: number
    orders: number
  }>
  lastUpdated: string
}

// Formatting functions
function formatCurrencyCompact(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'TND',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'TND',
  }).format(value || 0)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(value || 0))
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${Math.round(value)}%`
}

function getChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export default function ChiffreAffaire() {
  const [stats, setStats] = useState<RevenueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/order-stats')
      if (!response.ok) throw new Error('Failed to fetch revenue stats')
      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="ca-loading">
        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <p>Chargement des statistiques de revenus...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ca-error">
        <p>Erreur: {error}</p>
        <button onClick={fetchStats} className="ca-error__retry">
          <RefreshCw size={16} />
          Réessayer
        </button>
      </div>
    )
  }

  if (!stats) return null

  const todayChange = getChangePercent(stats.revenueToday, stats.revenueYesterday)
  const weekChange = getChangePercent(stats.revenueWeek, stats.revenueLastWeek)
  const monthChange = getChangePercent(stats.revenueMonth, stats.revenueLastMonth)

  return (
    <div className="ca-root">
      {/* Header */}
      <div className="ca-header">
        <div>
          <h2 className="ca-header__title">
            Chiffre d&apos;Affaires
          </h2>
          <p className="ca-header__subtitle">
            Dernière mise à jour : {new Date(stats.lastUpdated).toLocaleString('fr-FR')}
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="ca-refresh"
        >
          <RefreshCw size={16} />
          Actualiser
        </button>
      </div>

      {/* Main Revenue KPIs */}
      <div className="ca-kpis">
        {/* Today's Revenue */}
        <div className="orders-stat-card orders-stat-success">
          <div className="orders-stat-icon">
            <CircleDollarSign size={20} />
          </div>
          <div className="orders-stat-content">
            <div className="orders-stat-value">
              {formatCurrencyCompact(stats.revenueToday)}
            </div>
            <div className="orders-stat-label">Aujourd&apos;hui</div>
            <div className={`ca-change ${todayChange >= 0 ? 'ca-change--up' : 'ca-change--down'}`}>
              {todayChange >= 0 ? (
                <ArrowUpRight size={14} />
              ) : (
                <ArrowDownRight size={14} />
              )}
              <span className="ca-change__text">
                {formatPercent(todayChange)} vs hier
              </span>
            </div>
            <div className="orders-stat-note">
              {stats.ordersToday} commandes · {stats.activeCustomersToday} clients
            </div>
          </div>
        </div>

        {/* Weekly Revenue */}
        <div className="orders-stat-card orders-stat-info">
          <div className="orders-stat-icon">
            <Calendar size={20} />
          </div>
          <div className="orders-stat-content">
            <div className="orders-stat-value">
              {formatCurrencyCompact(stats.revenueWeek)}
            </div>
            <div className="orders-stat-label">Cette semaine</div>
            <div className={`ca-change ${weekChange >= 0 ? 'ca-change--up' : 'ca-change--down'}`}>
              {weekChange >= 0 ? (
                <ArrowUpRight size={14} />
              ) : (
                <ArrowDownRight size={14} />
              )}
              <span className="ca-change__text">
                {formatPercent(weekChange)} vs semaine dernière
              </span>
            </div>
            <div className="orders-stat-note">
              {stats.ordersWeek} commandes · {stats.activeCustomersWeek} clients
            </div>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="orders-stat-card orders-stat-warning">
          <div className="orders-stat-icon">
            <TrendingUp size={20} />
          </div>
          <div className="orders-stat-content">
            <div className="orders-stat-value">
              {formatCurrencyCompact(stats.revenueMonth)}
            </div>
            <div className="orders-stat-label">Ce mois</div>
            <div className={`ca-change ${monthChange >= 0 ? 'ca-change--up' : 'ca-change--down'}`}>
              {monthChange >= 0 ? (
                <ArrowUpRight size={14} />
              ) : (
                <ArrowDownRight size={14} />
              )}
              <span className="ca-change__text">
                {formatPercent(monthChange)} vs mois dernier
              </span>
            </div>
            <div className="orders-stat-note">
              {stats.ordersMonth} commandes · {stats.activeCustomersMonth} clients
            </div>
          </div>
        </div>

        {/* Yearly Revenue */}
        <div className="orders-stat-card">
          <div className="orders-stat-icon">
            <BarChart3 size={20} />
          </div>
          <div className="orders-stat-content">
            <div className="orders-stat-value">
              {formatCurrencyCompact(stats.revenueYear)}
            </div>
            <div className="orders-stat-label">Cette année</div>
            <div className="orders-stat-note">
              {stats.ordersYear} commandes
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="ca-metrics">
        <div className="ca-metric">
          <Wallet size={20} className="ca-metric__icon" />
          <div>
            <div className="ca-metric__value">
              {formatCurrencyCompact(stats.averageOrderMonth)}
            </div>
            <div className="ca-metric__label">Panier moyen (mois)</div>
          </div>
        </div>

        <div className="ca-metric">
          <ShoppingCart size={20} className="ca-metric__icon" />
          <div>
            <div className="ca-metric__value">
              {formatNumber(stats.ordersMonth)}
            </div>
            <div className="ca-metric__label">Commandes (mois)</div>
          </div>
        </div>

        <div className="ca-metric">
          <Users size={20} className="ca-metric__icon" />
          <div>
            <div className="ca-metric__value">
              {formatNumber(stats.activeCustomersMonth)}
            </div>
            <div className="ca-metric__label">Clients actifs (mois)</div>
          </div>
        </div>

        <div className="ca-metric">
          <CreditCard size={20} className="ca-metric__icon" />
          <div>
            <div className="ca-metric__value">
              {formatCurrencyCompact(stats.revenueMonth > 0 ? stats.revenueMonth / stats.ordersMonth : 0)}
            </div>
            <div className="ca-metric__label">Revenu/commande</div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="ca-card">
        <div className="ca-card__head">
          <h3 className="ca-card__title">
            Évolution des revenus
          </h3>
          <div className="ca-tabs">
            <button
              onClick={() => setTimeframe('daily')}
              className={`ca-tab${timeframe === 'daily' ? ' ca-tab--active' : ''}`}
            >
              Journalier
            </button>
            <button
              onClick={() => setTimeframe('weekly')}
              className={`ca-tab${timeframe === 'weekly' ? ' ca-tab--active' : ''}`}
            >
              Hebdomadaire
            </button>
            <button
              onClick={() => setTimeframe('monthly')}
              className={`ca-tab${timeframe === 'monthly' ? ' ca-tab--active' : ''}`}
            >
              Mensuel
            </button>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="ca-chart">
          {timeframe === 'daily' && stats.dailyRevenue && stats.dailyRevenue.map((day, index) => {
            const maxRevenue = Math.max(...stats.dailyRevenue.map(d => d.revenue), 1)
            const height = (day.revenue / maxRevenue) * 100
            return (
              <div key={index} className="ca-bar">
                <div className="ca-bar__value">
                  {day.revenue > 0 ? formatCurrencyCompact(day.revenue) : ''}
                </div>
                <div className="ca-bar__track">
                  <div
                    className="ca-bar__fill ca-bar__fill--daily"
                    style={{
                      height: `${height}%`,
                      minHeight: day.revenue > 0 ? '4px' : '0'
                    }}
                  />
                </div>
                <div className="ca-bar__label">
                  {new Date(day.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            )
          })}

          {timeframe === 'weekly' && stats.weeklyRevenue && stats.weeklyRevenue.map((week, index) => {
            const maxRevenue = Math.max(...stats.weeklyRevenue.map(w => w.revenue), 1)
            const height = (week.revenue / maxRevenue) * 100
            return (
              <div key={index} className="ca-bar">
                <div className="ca-bar__value">
                  {week.revenue > 0 ? formatCurrencyCompact(week.revenue) : ''}
                </div>
                <div className="ca-bar__track">
                  <div
                    className="ca-bar__fill ca-bar__fill--weekly"
                    style={{
                      height: `${height}%`,
                      minHeight: week.revenue > 0 ? '4px' : '0'
                    }}
                  />
                </div>
                <div className="ca-bar__label ca-bar__label--sm">
                  {week.week}
                </div>
              </div>
            )
          })}

          {timeframe === 'monthly' && stats.monthlyRevenue && stats.monthlyRevenue.map((month, index) => {
            const maxRevenue = Math.max(...stats.monthlyRevenue.map(m => m.revenue), 1)
            const height = (month.revenue / maxRevenue) * 100
            return (
              <div key={index} className="ca-bar">
                <div className="ca-bar__value">
                  {month.revenue > 0 ? formatCurrencyCompact(month.revenue) : ''}
                </div>
                <div className="ca-bar__track">
                  <div
                    className="ca-bar__fill ca-bar__fill--monthly"
                    style={{
                      height: `${height}%`,
                      minHeight: month.revenue > 0 ? '4px' : '0'
                    }}
                  />
                </div>
                <div className="ca-bar__label ca-bar__label--sm">
                  {month.month.split(' ')[0]}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Revenue by Source */}
      {stats.bySource && stats.bySource.length > 0 && (
        <div className="ca-card">
          <h3 className="ca-card__title ca-card__title--spaced">
            Revenus par source (ce mois)
          </h3>
          <div className="ca-sources">
            {stats.bySource.map((source, index) => (
              <div key={index}>
                <div className="ca-source__head">
                  <span className="ca-source__name">{source.source}</span>
                  <span className="ca-source__pct">{source.percentage}%</span>
                </div>
                <div className="ca-source__track">
                  <div
                    className="ca-source__fill"
                    style={{ width: `${source.percentage}%` }}
                  />
                </div>
                <div className="ca-source__meta">
                  <span>{formatCurrencyCompact(source.revenue)}</span>
                  <span>{source.orders} commandes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 5 Days */}
      {stats.topDays && stats.topDays.length > 0 && (
        <div className="ca-card ca-card--last">
          <h3 className="ca-card__title ca-card__title--spaced">
            Top 5 des meilleurs jours
          </h3>
          <div className="ca-top">
            {stats.topDays.map((day, index) => (
              <div key={index} className="ca-top__row">
                <span className="ca-top__rank">
                  #{index + 1}
                </span>
                <div className="ca-top__body">
                  <div className="ca-top__date">
                    {new Date(day.date).toLocaleDateString('fr-FR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="ca-top__orders">
                    {day.orders} commandes
                  </div>
                </div>
                <div className="ca-top__amount">
                  {formatCurrencyCompact(day.revenue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}