'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell } from 'lucide-react'
import { useAuth } from '@payloadcms/ui'
import './index.scss'

type NotificationDoc = {
  id: string
  type?: string
  title?: string
  message?: string | null
  read?: boolean | null
  createdAt?: string
  order?: string | { id: string; orderNumber?: string } | null
  review?: string | { id: string } | null
}

const TYPE_LABELS: Record<string, string> = {
  new_order: 'Nouvelle commande',
  order_reminder: 'Rappel',
  high_value_order: 'Importante',
  status_change: 'Statut',
  new_review: 'Avis',
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  return `il y a ${days} j`
}

export default function AdminNotifications() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState({ top: 56, right: 12 })
  const panelRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)

  const role = (user as { role?: string } | null | undefined)?.role
  const allowed =
    role === 'owner' || role === 'admin' || role === 'sales'

  const unreadCount = items.filter((n) => !n.read).length

  useEffect(() => {
    setMounted(true)
  }, [])

  const updatePosition = useCallback(() => {
    if (!bellRef.current) return
    const rect = bellRef.current.getBoundingClientRect()
    setCoords({
      top: Math.round(rect.bottom + 8),
      right: Math.round(window.innerWidth - rect.right),
    })
  }, [])

  const fetchNotifications = useCallback(async () => {
    if (!user || !allowed) return
    setLoading(true)
    try {
      const userId = (user as { id?: string }).id
      const qs = new URLSearchParams({
        limit: '20',
        sort: '-createdAt',
        depth: '1',
        'where[user][equals]': String(userId),
      })
      const res = await fetch(`/api/notifications?${qs}`, {
        credentials: 'include',
      })
      if (!res.ok) return
      const data = await res.json()
      setItems(data.docs || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [user, allowed])

  useEffect(() => {
    fetchNotifications()
    const id = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(id)
  }, [fetchNotifications])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (bellRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onScroll = () => updatePosition()
    const onResize = () => updatePosition()
    document.addEventListener('mousedown', onClick)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, updatePosition])

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      })
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      )
    } catch {
      // silent
    }
  }

  const markAllRead = async () => {
    const unread = items.filter((n) => !n.read)
    await Promise.all(unread.map((n) => markAsRead(n.id)))
  }

  const openNotification = async (n: NotificationDoc) => {
    if (!n.read) await markAsRead(n.id)
    setOpen(false)
    const orderId =
      typeof n.order === 'object' && n.order ? n.order.id : n.order
    const reviewId =
      typeof n.review === 'object' && n.review ? n.review.id : n.review
    if (orderId) {
      window.location.href = `/admin/collections/orders/${orderId}`
    } else if (reviewId) {
      window.location.href = `/admin/collections/reviews/${reviewId}`
    }
  }

  if (!user || !allowed) return null

  const dropdown =
    open && mounted
      ? createPortal(
          <div
            ref={panelRef}
            className="admin-notif__dropdown"
            style={{
              top: coords.top,
              right: coords.right,
            }}
          >
            <div className="admin-notif__header">
              <strong>Notifications</strong>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="admin-notif__mark-all"
                  onClick={markAllRead}
                >
                  Tout marquer lu
                </button>
              )}
            </div>

            <div className="admin-notif__list">
              {loading && items.length === 0 && (
                <div className="admin-notif__empty">Chargement…</div>
              )}
              {!loading && items.length === 0 && (
                <div className="admin-notif__empty">Aucune notification</div>
              )}
              {items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`admin-notif__item${n.read ? '' : ' is-unread'}`}
                  onClick={() => openNotification(n)}
                >
                  <div className="admin-notif__item-top">
                    <span className="admin-notif__type">
                      {TYPE_LABELS[n.type || ''] || n.type || 'Info'}
                    </span>
                    <span className="admin-notif__time">{timeAgo(n.createdAt)}</span>
                  </div>
                  <div className="admin-notif__title">{n.title}</div>
                  {n.message && (
                    <div className="admin-notif__message">{n.message}</div>
                  )}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div className="admin-notif">
      <button
        type="button"
        ref={bellRef}
        className="admin-notif__bell"
        onClick={() => {
          const next = !open
          if (next) {
            updatePosition()
            fetchNotifications()
          }
          setOpen(next)
        }}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="admin-notif__badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {dropdown}
    </div>
  )
}
