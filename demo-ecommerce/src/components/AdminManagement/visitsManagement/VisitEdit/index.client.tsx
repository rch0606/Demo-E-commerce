'use client'

import { useEffect, useRef, useState } from 'react'

import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Eye,
  Globe2,
  MapPin,
  MousePointerClick,
  Megaphone,
  Clock,
  Link2,
  Monitor,
  Trash2,
  Navigation,
  Play,
  Loader2,
} from 'lucide-react'
import './index.css'


type VisitEvent = {
  type?: string
  path?: string
  roomId?: string
  at?: string
  productId?: string
  productName?: string
  value?: number
  quantity?: number
  orderId?: string
  orderNumber?: string
  itemCount?: number
  promoCode?: string
  discountAmount?: number
}

type VisitPage = {
  path?: string
  title?: string
  visitedAt?: string
  room?: string
}

type VisitDoc = {
  id: string
  visitId?: string
  source?: string | null
  pageViews?: number | null
  firstPage?: string | null
  referrer?: string | null
  ip?: string | null
  userAgent?: string | null
  browser?: string | null
  browserVersion?: string | null
  os?: string | null
  osVersion?: string | null
  deviceType?: string | null
  device?: string | null
  host?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  fbclid?: string | null
  gclid?: string | null
  msclkid?: string | null
  ttclid?: string | null
  startedAt?: string | null
  lastSeenAt?: string | null
  location?: {
    country?: string | null
    countryCode?: string | null
    city?: string | null
    region?: string | null
    timezone?: string | null
    latitude?: number | null
    longitude?: number | null
    org?: string | null
  } | null
  pages?: VisitPage[] | null
  events?: VisitEvent[] | null
  rooms?: { roomId?: string | null }[] | null
}


const SOURCE_LABELS: Record<string, string> = {
  organic: 'Organic (SEO)',
  ads: 'Ads',
  social: 'Social',
  referral: 'Referral',
  direct: 'Site',
}

const EVENT_LABELS: Record<string, string> = {
  view_product: 'Vue produit',
  add_to_cart: 'Ajout panier',
  remove_from_cart: 'Retrait panier',
  add_to_wishlist: 'Ajout favoris',
  remove_from_wishlist: 'Retrait favoris',
  begin_checkout: 'Début commande',
  purchase: 'Achat',
  apply_promo: 'Code promo',
  click_whatsapp: 'Clic WhatsApp',
  click_instagram: 'Clic Instagram',
  click_facebook: 'Clic Facebook',
  click_tiktok: 'Clic TikTok',
  click_social: 'Clic réseau social',
}


function formatDate(value?: string | null) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(value))
  } catch {
    return '—'
  }
}

function formatMoney(value?: number | null) {
  if (value == null || Number.isNaN(value)) return null
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'TND',
    maximumFractionDigits: 2,
  }).format(value)
}

export default function VisitEditClient({
  id,
  initialDoc,
}: {
  id?: string
  initialDoc?: VisitDoc | null
}) {
  const router = useRouter()
  const [visit, setVisit] = useState<VisitDoc | null>(initialDoc || null)
  const [loading, setLoading] = useState(!initialDoc)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    if (initialDoc?.id === id) {
      setVisit(initialDoc)
      setLoading(false)
      return
    }

    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/visits/${id}?depth=0`, {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setVisit(data)
        } else if (!cancelled) {
          setVisit(null)
        }
      } catch {
        if (!cancelled) setVisit(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, initialDoc])

  const handleDelete = async () => {
    if (!id) return
    if (!confirm('Supprimer cette visite ?')) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/visits/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        router.replace('/admin/collections/visits')
        router.refresh()
      } else {
        alert('Erreur lors de la suppression')
      }
    } catch {
      alert('Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="visit-edit-loading">
        <div className="visit-edit-spinner" />
        <p>Chargement de la visite…</p>
      </div>
    )
  }

  if (!visit) {
    return (
      <div className="visit-edit-loading">
        <p>Visite introuvable</p>
        <button
          type="button"
          className="visit-edit-back-btn"
          onClick={() => router.push('/admin/collections/visits')}
        >
          Retour à la liste
        </button>
      </div>
    )
  }

  const pages = Array.isArray(visit.pages) ? visit.pages : []
  const events = Array.isArray(visit.events) ? visit.events : []
  const source = visit.source || 'organic'
  const loc = visit.location || {}

  // Ordered unique rooms (Enregistrement 1, 2, 3…) — technical id kept under the hood
  const roomIds: string[] = []
  const seenRooms = new Set<string>()
  const pushRoom = (id?: string | null) => {
    if (!id) return
    const s = String(id)
    if (seenRooms.has(s)) return
    seenRooms.add(s)
    roomIds.push(s)
  }
  for (const r of Array.isArray(visit.rooms) ? visit.rooms : []) {
    pushRoom(r?.roomId)
  }
  for (const p of pages) {
    pushRoom(p.room)
  }
  for (const ev of events) {
    pushRoom(ev.roomId)
  }

  const roomLabel = (id?: string | null) => {
    if (!id) return null
    const idx = roomIds.indexOf(String(id))
    return idx >= 0 ? `Enregistrement ${idx + 1}` : `Enregistrement`
  }

  return (

    <div className="visit-edit">
      {/* Header */}
      <div className="visit-edit-header">

        <div className="visit-edit-header-left">
          <button
            type="button"
            className="visit-edit-back-btn"
            onClick={() => router.push('/admin/collections/visits')}
          >
            <ArrowLeft size={16} strokeWidth={2} />
            <span>Retour</span>
          </button>
          <div>
            <h1 className="visit-edit-title">Détail de la visite</h1>
            <p className="visit-edit-subtitle">
              <code>{visit.visitId || visit.id}</code>
            </p>
          </div>
        </div>
        <div className="visit-edit-header-right">
          <span className={`visit-source-badge visit-source-badge--${source}`}>
            {SOURCE_LABELS[source] || source}
          </span>
          <button
            type="button"
            className="visit-edit-delete-btn"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 size={15} strokeWidth={2} />
            <span>{isDeleting ? '…' : 'Supprimer'}</span>
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="visit-edit-kpis">
        <div className="visit-kpi">
          <div className="visit-kpi-icon visit-kpi-icon--accent">
            <Eye size={18} strokeWidth={2} />
          </div>
          <div>
            <div className="visit-kpi-value">{visit.pageViews ?? pages.length ?? 1}</div>
            <div className="visit-kpi-label">Pages vues</div>
          </div>
        </div>
        <div className="visit-kpi">
          <div className="visit-kpi-icon visit-kpi-icon--purple">
            <MousePointerClick size={18} strokeWidth={2} />
          </div>
          <div>
            <div className="visit-kpi-value">{events.length}</div>
            <div className="visit-kpi-label">Événements</div>
          </div>
        </div>
        <div className="visit-kpi">
          <div className="visit-kpi-icon visit-kpi-icon--warning">
            <Clock size={18} strokeWidth={2} />
          </div>
          <div>
            <div className="visit-kpi-value visit-kpi-value--sm">
              {formatDate(visit.startedAt)}
            </div>
            <div className="visit-kpi-label">Début de session</div>
          </div>
        </div>
        <div className="visit-kpi">
          <div className="visit-kpi-icon visit-kpi-icon--success">
            <Navigation size={18} strokeWidth={2} />
          </div>
          <div>
            <div className="visit-kpi-value visit-kpi-value--sm">
              {formatDate(visit.lastSeenAt)}
            </div>
            <div className="visit-kpi-label">Dernière activité</div>
          </div>
        </div>
      </div>

      <div className="visit-edit-grid">
        {/* Left column */}
        <div className="visit-edit-col">
          {/* Visitor */}
          <section className="visit-card">
            <div className="visit-card-head">
              <Globe2 size={16} strokeWidth={2} />
              <h2>Visiteur</h2>
            </div>
            <div className="visit-card-body visit-fields">
              <div className="visit-field">
                <span className="visit-field-label">IP</span>
                <span className="visit-field-value mono">{visit.ip || '—'}</span>
              </div>
              <div className="visit-field">
                <span className="visit-field-label">Host</span>
                <span className="visit-field-value">{visit.host || '—'}</span>
              </div>
              <div className="visit-field">
                <span className="visit-field-label">Première page</span>
                <span className="visit-field-value">{visit.firstPage || '—'}</span>
              </div>
              <div className="visit-field">
                <span className="visit-field-label">Referrer</span>
                <span className="visit-field-value break">
                  {visit.referrer || 'Accès direct'}
                </span>
              </div>
              <div className="visit-field">
                <span className="visit-field-label">
                  <Monitor size={12} /> Navigateur
                </span>
                <span className="visit-field-value">
                  {visit.browser
                    ? `${visit.browser}${visit.browserVersion ? ` ${visit.browserVersion.split('.')[0]}` : ''}`
                    : '—'}
                </span>
              </div>
              <div className="visit-field">
                <span className="visit-field-label">Système</span>
                <span className="visit-field-value">
                  {visit.os
                    ? `${visit.os}${visit.osVersion ? ` ${visit.osVersion}` : ''}`
                    : '—'}
                </span>
              </div>
              <div className="visit-field">
                <span className="visit-field-label">Appareil</span>
                <span className="visit-field-value">
                  {visit.deviceType === 'mobile'
                    ? 'Mobile'
                    : visit.deviceType === 'tablet'
                      ? 'Tablette'
                      : visit.deviceType === 'desktop'
                        ? 'Desktop'
                        : visit.deviceType || '—'}
                  {visit.device ? ` · ${visit.device}` : ''}
                </span>
              </div>
              {visit.userAgent ? (
                <div className="visit-field visit-field--full">
                  <span className="visit-field-label">User-Agent (brut)</span>
                  <span className="visit-field-value muted small break">
                    {visit.userAgent}
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          {/* Location */}
          <section className="visit-card">
            <div className="visit-card-head">
              <MapPin size={16} strokeWidth={2} />
              <h2>Localisation</h2>
            </div>
            <div className="visit-card-body visit-fields">
              <div className="visit-field">
                <span className="visit-field-label">Pays</span>
                <span className="visit-field-value">
                  {[loc.country, loc.countryCode].filter(Boolean).join(' · ') || '—'}
                </span>
              </div>
              <div className="visit-field">
                <span className="visit-field-label">Ville</span>
                <span className="visit-field-value">{loc.city || '—'}</span>
              </div>
              <div className="visit-field">
                <span className="visit-field-label">Région</span>
                <span className="visit-field-value">{loc.region || '—'}</span>
              </div>
              <div className="visit-field">
                <span className="visit-field-label">Fuseau</span>
                <span className="visit-field-value">{loc.timezone || '—'}</span>
              </div>
              <div className="visit-field">
                <span className="visit-field-label">FAI</span>
                <span className="visit-field-value">{loc.org || '—'}</span>
              </div>
              <div className="visit-field">
                <span className="visit-field-label">Coords</span>
                <span className="visit-field-value mono">
                  {loc.latitude != null && loc.longitude != null
                    ? `${loc.latitude}, ${loc.longitude}`
                    : '—'}
                </span>
              </div>
            </div>
          </section>

          {/* Attribution */}
          <section className="visit-card">
            <div className="visit-card-head">
              <Megaphone size={16} strokeWidth={2} />
              <h2>Attribution (Ads / UTM)</h2>
            </div>
            <div className="visit-card-body visit-fields">
              <div className="visit-field">
                <span className="visit-field-label">UTM Source</span>
                <span className="visit-field-value">{visit.utmSource || '—'}</span>
              </div>
              <div className="visit-field">
                <span className="visit-field-label">UTM Medium</span>
                <span className="visit-field-value">{visit.utmMedium || '—'}</span>
              </div>
              <div className="visit-field visit-field--full">
                <span className="visit-field-label">UTM Campaign</span>
                <span className="visit-field-value">{visit.utmCampaign || '—'}</span>
              </div>
              <div className="visit-field">
                <span className="visit-field-label">fbclid</span>
                <span className="visit-field-value mono small break">
                  {visit.fbclid || '—'}
                </span>
              </div>
              <div className="visit-field">
                <span className="visit-field-label">gclid</span>
                <span className="visit-field-value mono small break">
                  {visit.gclid || '—'}
                </span>
              </div>
              {(visit.msclkid || visit.ttclid) && (
                <>
                  <div className="visit-field">
                    <span className="visit-field-label">msclkid</span>
                    <span className="visit-field-value mono small break">
                      {visit.msclkid || '—'}
                    </span>
                  </div>
                  <div className="visit-field">
                    <span className="visit-field-label">ttclid</span>
                    <span className="visit-field-value mono small break">
                      {visit.ttclid || '—'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        {/* Right column — journey */}
        <div className="visit-edit-col visit-edit-col--wide">
          {/* Session replay */}
          <SessionReplayCard roomIds={roomIds} roomLabel={roomLabel} />

          {/* Pages timeline */}
          <section className="visit-card">
            <div className="visit-card-head">
              <Link2 size={16} strokeWidth={2} />
              <h2>Parcours pages</h2>
              <span className="visit-card-count">{pages.length}</span>
            </div>

            <div className="visit-card-body">
              {pages.length === 0 ? (
                <p className="visit-empty">Aucune page enregistrée</p>
              ) : (
                <ol className="visit-timeline">
                  {pages.map((p, i) => (
                    <li key={`${p.path}-${i}`} className="visit-timeline-item">
                      <div className="visit-timeline-dot" />
                      <div className="visit-timeline-content">
                        <div className="visit-timeline-top">
                          <span className="visit-timeline-path">{p.path || '/'}</span>
                          <span className="visit-timeline-time">
                            {formatDate(p.visitedAt)}
                          </span>
                        </div>
                        {p.title ? (
                          <div className="visit-timeline-title">{p.title}</div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

          {/* Events */}
          <section className="visit-card">
            <div className="visit-card-head">
              <MousePointerClick size={16} strokeWidth={2} />
              <h2>Événements</h2>
              <span className="visit-card-count">{events.length}</span>
            </div>
            <div className="visit-card-body">
              {events.length === 0 ? (
                <p className="visit-empty">Aucun événement tracké</p>
              ) : (
                <div className="visit-events">
                  {events.map((ev, i) => {
                    const type = (ev.type || '').toLowerCase()
                    const label = EVENT_LABELS[type] || type || 'Événement'
                    return (
                      <article
                        key={`${type}-${i}`}
                        className={`visit-event visit-event--${type || 'other'}`}
                      >
                        <div className="visit-event-head">
                          <span className={`visit-event-type visit-event-type--${type || 'other'}`}>
                            {label}
                          </span>
                          <span className="visit-event-time">{formatDate(ev.at)}</span>
                        </div>
                        {ev.path ? (
                          <div className="visit-event-path">{ev.path}</div>
                        ) : null}
                        {ev.roomId ? (
                          <div className="visit-event-room">
                            <span
                              className="visit-chip visit-chip--room"
                              title={`Enregistrement · ${ev.roomId}`}
                            >
                              🎥 {roomLabel(ev.roomId)}
                            </span>
                          </div>
                        ) : null}
                        <div className="visit-event-meta">
                          {ev.productName || ev.productId ? (
                            <span className="visit-chip">
                              {ev.productName || ev.productId}
                              {ev.productId && ev.productName
                                ? ` · ${ev.productId}`
                                : ''}
                            </span>
                          ) : null}
                          {ev.value != null ? (
                            <span className="visit-chip visit-chip--money">
                              {formatMoney(ev.value)}
                            </span>
                          ) : null}
                          {ev.quantity != null ? (
                            <span className="visit-chip">Qté {ev.quantity}</span>
                          ) : null}
                          {ev.itemCount != null ? (
                            <span className="visit-chip">{ev.itemCount} art.</span>
                          ) : null}
                          {ev.orderNumber || ev.orderId ? (
                            <span className="visit-chip visit-chip--order">
                              {ev.orderNumber || ev.orderId}
                            </span>
                          ) : null}
                          {ev.promoCode ? (
                            <span className="visit-chip visit-chip--promo">
                              {ev.promoCode}
                              {ev.discountAmount != null
                                ? ` (−${formatMoney(ev.discountAmount)})`
                                : ''}
                            </span>
                          ) : null}
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

/** Session replay card — loads /api/record/:roomId and plays with rrweb-player */
function SessionReplayCard({
  roomIds,
  roomLabel,
}: {
  roomIds: string[]
  roomLabel: (id?: string | null) => string | null
}) {
  const [selectedRoom, setSelectedRoom] = useState(roomIds[0] || '')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [eventCount, setEventCount] = useState(0)
  const playerHostRef = useRef<HTMLDivElement>(null)
  const playerInstanceRef = useRef<{ $destroy?: () => void } | null>(null)

  useEffect(() => {
    if (roomIds.length && !selectedRoom) {
      setSelectedRoom(roomIds[0])
    }
  }, [roomIds, selectedRoom])

  // Destroy player on unmount / room change
  useEffect(() => {
    return () => {
      try {
        playerInstanceRef.current?.$destroy?.()
      } catch {
        /* ignore */
      }
      playerInstanceRef.current = null
    }
  }, [selectedRoom])

  const loadAndPlay = async () => {
    if (!selectedRoom) return
    setStatus('loading')
    setErrorMsg(null)
    setEventCount(0)

    try {
      playerInstanceRef.current?.$destroy?.()
    } catch {
      /* ignore */
    }
    playerInstanceRef.current = null
    if (playerHostRef.current) playerHostRef.current.innerHTML = ''

    try {
      const res = await fetch(`/api/record/${encodeURIComponent(selectedRoom)}`, {
        credentials: 'include',
      })
      const data = await res.json()

      if (!res.ok || !data?.ok) {
        setStatus('error')
        setErrorMsg(
          data?.error === 'Forbidden'
            ? 'Vous n’avez pas l’autorisation d’accéder à cette vidéo.'
            : 'Impossible de charger la vidéo de cette visite. Veuillez réessayer plus tard.',
        )
        return
      }

      // Sort by timestamp — required for correct replay
      const events = (Array.isArray(data.events) ? data.events : [])
        .filter((e: any) => e && typeof e === 'object' && typeof e.type === 'number')
        .sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0))

      setEventCount(events.length)

      if (!events.length) {
        setStatus('empty')
        return
      }

      // FullSnapshot (type 2) is required — without it the player stays blank
      const hasFullSnapshot = events.some((e: any) => e.type === 2)
      if (!hasFullSnapshot) {
        setStatus('error')
        setErrorMsg(
          'La vidéo de cette visite n’est pas disponible. Cela arrive parfois lorsque le visiteur n’est resté que très peu de temps sur le site. Essayez de consulter une autre visite plus récente.',
        )
        return
      }

      // Dynamic import — avoids SSR / missing package breaking the page
      const [{ default: rrwebPlayer }] = await Promise.all([
        import('rrweb-player'),
        import('rrweb-player/dist/style.css'),
      ])

      if (!playerHostRef.current) {
        setStatus('error')
        setErrorMsg('Impossible d’afficher la vidéo pour le moment. Veuillez réessayer.')
        return
      }

      const width = Math.min(playerHostRef.current.clientWidth || 720, 900)
      const height = Math.round(width * 0.56)

      playerInstanceRef.current = new rrwebPlayer({
        target: playerHostRef.current,
        props: {
          events,
          width,
          height,
          autoPlay: true,
          showController: true,
          speed: 1,
          skipInactive: true,
          mouseTail: true,
        },
      }) as { $destroy?: () => void }

      setStatus('ready')
    } catch (err: any) {
      console.error('[SessionReplay]', err)
      setStatus('error')
      setErrorMsg(
        err?.message?.includes('rrweb-player') || err?.code === 'MODULE_NOT_FOUND'
          ? 'La lecture des vidéos n’est pas disponible pour le moment. Contactez le support technique.'
          : 'Impossible de charger la vidéo de cette visite. Veuillez réessayer plus tard.',
      )
    }
  }

  return (
    <section className="visit-card visit-card--replay">
      <div className="visit-card-head">
        <Play size={16} strokeWidth={2} />
        <h2>Enregistrement session</h2>
        {roomIds.length ? (
          <span className="visit-card-count">
            {roomIds.length} enregistrement{roomIds.length > 1 ? 's' : ''}
          </span>
        ) : null}
      </div>
      <div className="visit-card-body">
        {roomIds.length === 0 ? (
          <p className="visit-replay-msg">
            Aucune vidéo enregistrée pour cette visite. L’enregistrement démarre automatiquement
            lorsqu’un visiteur navigue sur le site.
          </p>
        ) : (
          <>
            <div className="visit-replay-toolbar">
              <label className="visit-replay-label">
                Enregistrement
                <select
                  className="visit-replay-select"
                  value={selectedRoom}
                  onChange={(e) => {
                    setSelectedRoom(e.target.value)
                    setStatus('idle')
                    setErrorMsg(null)
                    try {
                      playerInstanceRef.current?.$destroy?.()
                    } catch {
                      /* ignore */
                    }
                    playerInstanceRef.current = null
                    if (playerHostRef.current) playerHostRef.current.innerHTML = ''
                  }}
                >
                  {roomIds.map((id) => (
                    <option key={id} value={id}>
                      {roomLabel(id) || id}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="visit-replay-btn"
                onClick={loadAndPlay}
                disabled={status === 'loading' || !selectedRoom}
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 size={15} className="visit-spin-icon" />
                    Chargement…
                  </>
                ) : (
                  <>
                    <Play size={15} />
                    Rejouer la session
                  </>
                )}
              </button>
              {status === 'ready' && eventCount > 0 ? (
                <span className="visit-replay-meta">{eventCount} événements</span>
              ) : null}
            </div>

            {status === 'empty' ? (
              <p className="visit-replay-msg">
                La vidéo de cette visite n’est pas disponible. Cela arrive parfois lorsque le
                visiteur n’est resté que très peu de temps sur le site. Essayez de consulter une
                autre visite plus récente.
              </p>
            ) : null}
            {status === 'error' && errorMsg ? (
              <p className="visit-replay-msg">{errorMsg}</p>
            ) : null}

            <div
              ref={playerHostRef}
              className="visit-replay-player"
              data-status={status}
            />
          </>
        )}
      </div>
    </section>
  )
}

