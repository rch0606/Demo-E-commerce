'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Gift,
  ShoppingBag,
  ChevronRight,
} from 'lucide-react'
import './index.css'

interface Client {
  id: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  customerGouvernorat: string
  customerAddress: string
  customerBirthDate: string | null
  customerChildrenBirthDates: Array<{ date: string; label?: string }> | null
  totalOrders: number
  totalSpent: number
  lastOrderDate: string | null
  orderNumbers: string[]
}

const ClientsList = () => {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'orders' | 'spent' | 'recent'>('recent')

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients')
      const data = await response.json()
      setClients(data.clients || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients
    .filter(client => {
      const search = searchTerm.toLowerCase()
      return (
        client.customerName?.toLowerCase().includes(search) ||
        client.customerPhone?.includes(search) ||
        client.customerEmail?.toLowerCase().includes(search) ||
        client.customerGouvernorat?.toLowerCase().includes(search)
      )
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.customerName || '').localeCompare(b.customerName || '')
        case 'orders':
          return b.totalOrders - a.totalOrders
        case 'spent':
          return b.totalSpent - a.totalSpent
        case 'recent':
        default:
          if (!a.lastOrderDate) return 1
          if (!b.lastOrderDate) return -1
          return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime()
      }
    })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  const getDaysUntilBirthday = (dateString: string | null) => {
    if (!dateString) return null
    try {
      const today = new Date()
      const birthDate = new Date(dateString)
      const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
      
      if (nextBirthday < today) {
        nextBirthday.setFullYear(today.getFullYear() + 1)
      }
      
      const diffTime = nextBirthday.getTime() - today.getTime()
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    } catch {
      return null
    }
  }

  const getUpcomingBirthday = (client: Client) => {
    const allDates: Array<{ date: string; label: string; daysUntil: number }> = []
    
    if (client.customerBirthDate) {
      const days = getDaysUntilBirthday(client.customerBirthDate)
      if (days !== null && days <= 30) {
        allDates.push({
          date: client.customerBirthDate,
          label: 'Client',
          daysUntil: days,
        })
      }
    }
    
    if (client.customerChildrenBirthDates) {
      client.customerChildrenBirthDates.forEach(child => {
        if (child.date) {
          const days = getDaysUntilBirthday(child.date)
          if (days !== null && days <= 30) {
            allDates.push({
              date: child.date,
              label: child.label || 'Enfant',
              daysUntil: days,
            })
          }
        }
      })
    }
    
    allDates.sort((a, b) => a.daysUntil - b.daysUntil)
    return allDates[0] || null
  }

  if (loading) {
    return (
      <div className="clients-loading">
        <div className="clients-spinner"></div>
        <p>Chargement des clients...</p>
      </div>
    )
  }

  return (
    <div className="clients-container">
      <div className="clients-header">
        <div className="clients-title-section">
          <Users size={24} />
          <h1 className="clients-title">Liste de clients</h1>
          <span className="clients-count">{clients.length} client(s)</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="clients-filters">
        <div className="clients-search-wrapper">
          <Search size={18} className="clients-search-icon" />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone, gouvernorat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="clients-search-input"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="clients-sort-select"
        >
          <option value="recent">Plus récent</option>
          <option value="name">Nom (A-Z)</option>
          <option value="orders">Nombre de commandes</option>
          <option value="spent">Total dépensé</option>
        </select>
      </div>

      {/* Clients Table */}
      <div className="clients-table-wrapper">
        <table className="clients-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Téléphone</th>
              <th>Email</th>
              <th>Gouvernorat</th>
              <th>Commandes</th>
              <th>Total dépensé</th>
              <th>Dernière commande</th>
              <th>Anniversaire</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={9} className="clients-empty-state">
                  Aucun client trouvé
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => {
                const upcomingBirthday = getUpcomingBirthday(client)
                return (
                  <tr
                    key={client.id}
                    className="clients-row"
                    onClick={() => router.push(`/admin/collections/orders?search=${encodeURIComponent(client.customerPhone)}`)}
                  >
                    <td>
                      <div className="clients-name-cell">
                        <div className="clients-avatar">
                          {client.customerName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="clients-name">{client.customerName || 'Inconnu'}</div>
                          {client.customerAddress && (
                            <div className="clients-address">
                              <MapPin size={12} />
                              {client.customerAddress}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="clients-phone">
                        <Phone size={14} />
                        {client.customerPhone || '-'}
                      </div>
                    </td>
                    <td>
                      {client.customerEmail ? (
                        <div className="clients-email">
                          <Mail size={14} />
                          {client.customerEmail}
                        </div>
                      ) : (
                        <span className="clients-no-data">-</span>
                      )}
                    </td>
                    <td>{client.customerGouvernorat || '-'}</td>
                    <td>
                      <div className="clients-orders-count">
                        <ShoppingBag size={14} />
                        <strong>{client.totalOrders}</strong>
                      </div>
                    </td>
                    <td>
                      <strong className="clients-spent">
                        {client.totalSpent?.toFixed(2) || '0.00'} DT
                      </strong>
                    </td>
                    <td>{formatDate(client.lastOrderDate)}</td>
                    <td>
                      {upcomingBirthday ? (
                        <span className={`clients-birthday-badge ${upcomingBirthday.daysUntil === 0 ? 'today' : 'soon'}`}>
                          <Gift size={12} />
                          {upcomingBirthday.daysUntil === 0
                            ? "Aujourd'hui !"
                            : `${upcomingBirthday.daysUntil}j`}
                        </span>
                      ) : (
                        <span className="clients-no-data">-</span>
                      )}
                    </td>
                    <td>
                      <ChevronRight size={16} className="clients-chevron" />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ClientsList