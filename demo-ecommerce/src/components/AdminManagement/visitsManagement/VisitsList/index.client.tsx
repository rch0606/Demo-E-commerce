'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Eye,
  Search,
  X,
  MousePointerClick,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  ShoppingBag,
  Layers,
  Sparkles,
} from 'lucide-react'
import './index.css'

type VisitDoc = {
  id: string
  visitId?: string
  displayTitle?: string | null
  source?: string | null
  pageViews?: number | null
  firstPage?: string | null
  referrer?: string | null
  ip?: string | null
  browser?: string | null
  deviceType?: string | null
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
  } | null
  events?: { type?: string }[] | null
}

type TopRow = { label: string; count: number }

interface VisitsListProps {
  initialVisits?: {
    docs: VisitDoc[]
    totalDocs: number
    totalPages: number
    page: number
  }
  stats?: {
    total: number
    today: number
    week: number
    month?: number
    ads: number
    organic?: number
    social?: number
    direct?: number
    referral?: number
    adsPct?: number
    organicPct?: number
    socialPct?: number
    directPct?: number
    referralPct?: number
    fb?: number
    insta?: number
    google?: number
    tiktok?: number
    sampleSize?: number
    bouncePct?: number
    conversionPct?: number
    avgPages?: number
    funnel?: {
      sessions: number
      viewProduct: number
      addToCart: number
      beginCheckout: number
      purchase: number
    }
    topLanding?: TopRow[]
    topCampaigns?: TopRow[]
    topCities?: TopRow[]
    devices?: {
      mobile: number
      desktop: number
      tablet: number
    }
  }
}

const SOURCE_LABELS: Record<string, string> = {
  organic: 'Organic (SEO)',
  ads: 'Ads',
  social: 'Social',
  referral: 'Referral',
  direct: 'Site',
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
    }).format(new Date(value))
  } catch {
    return '—'
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(value || 0))
}

function truncate(str?: string | null, max = 42) {
  if (!str) return '—'
  return str.length > max ? str.slice(0, max) + '…' : str
}

/** Map raw utm / host strings to short friendly labels (never show click IDs). */
function normalizePlatformLabel(raw?: string | null): string | null {
  if (!raw) return null
  const s = String(raw).trim().toLowerCase()
  if (!s) return null
  // Never surface click-id-looking values
  if (/^(fbclid|gclid|msclkid|ttclid|wbraid|gbraid)/i.test(s)) return null
  if (s.length > 40 && /^[a-z0-9_-]+$/i.test(s)) return null

  // Instagram before Facebook — Meta ads often share fbclid
  if (/instagram|\big\b|ig\.me/.test(s)) return 'Insta'
  if (/facebook|meta|\bfb\b|fb\.com/.test(s)) return 'FB'
  if (/google|youtube|adwords|cpc/.test(s)) return 'Google'
  if (/tiktok|tt\b/.test(s)) return 'TikTok'
  if (/snapchat|snap/.test(s)) return 'Snap'
  if (/twitter|x\.com|t\.co/.test(s)) return 'X'
  if (/pinterest/.test(s)) return 'Pinterest'
  if (/linkedin/.test(s)) return 'LinkedIn'
  if (/whatsapp|wa\.me/.test(s)) return 'WhatsApp'
  if (/email|newsletter|mail/.test(s)) return 'Email'

  // Short readable source as-is (capitalize first letter)
  if (s.length <= 16) return s.charAt(0).toUpperCase() + s.slice(1)
  return truncate(s, 16)
}

type AttrChip = {
  label: string
  kind: 'fb' | 'ig' | 'g' | 'tt' | 'camp' | 'default'
}

function chipKind(label: string): AttrChip['kind'] {
  if (label === 'Insta') return 'ig'
  if (label === 'FB') return 'fb'
  if (label === 'Google') return 'g'
  if (label === 'TikTok') return 'tt'
  return 'default'
}

/** Detect Instagram from referrer / utm (Meta ads use fbclid for both FB and IG). */
function isInstagramVisit(v: VisitDoc): boolean {
  const utm = String(v.utmSource || '').toLowerCase()
  if (/instagram|\big\b/.test(utm)) return true
  if (v.referrer) {
    try {
      const host = new URL(v.referrer).hostname.replace(/^www\./, '').toLowerCase()
      if (/instagram|\big\b/.test(host)) return true
    } catch {
      /* ignore */
    }
  }
  return false
}

/** One platform chip (+ optional human campaign name). No raw IDs. */
function getAttributionChips(v: VisitDoc): AttrChip[] {
  const chips: AttrChip[] = []

  // 1) Platform — prefer Insta when referrer/utm says so (even if fbclid is present)
  if (isInstagramVisit(v)) {
    chips.push({ label: 'Insta', kind: 'ig' })
  } else if (v.fbclid) {
    chips.push({ label: 'FB', kind: 'fb' })
  } else if (v.gclid) {
    chips.push({ label: 'Google', kind: 'g' })
  } else if (v.ttclid) {
    chips.push({ label: 'TikTok', kind: 'tt' })
  } else if (v.msclkid) {
    chips.push({ label: 'Bing', kind: 'default' })
  } else {
    const utmLabel = normalizePlatformLabel(v.utmSource)
    if (utmLabel) {
      chips.push({ label: utmLabel, kind: chipKind(utmLabel) })
    } else if (v.referrer) {
      try {
        const host = new URL(v.referrer).hostname.replace(/^www\./, '').toLowerCase()
        const refLabel = normalizePlatformLabel(host)
        if (refLabel) {
          chips.push({ label: refLabel, kind: chipKind(refLabel) })
        } else if (host) {
          const short = host.split('.').slice(-2).join('.')
          chips.push({
            label: short.length <= 18 ? short : truncate(short, 16),
            kind: 'default',
          })
        }
      } catch {
        /* ignore bad referrer */
      }
    }
  }

  // 2) Campaign — only readable names (skip pure Meta/Google numeric IDs)
  if (v.utmCampaign) {
    const raw = String(v.utmCampaign).trim()
    const isNumericId = /^\d{6,}$/.test(raw)
    if (raw && !isNumericId) {
      chips.push({ label: truncate(raw, 16), kind: 'camp' })
    }
  }

  // 3) Fallback from source bucket
  if (chips.length === 0) {
    if (v.source === 'direct') chips.push({ label: 'Site', kind: 'default' })
    else if (v.source === 'organic') chips.push({ label: 'SEO', kind: 'default' })
    else if (v.source === 'referral') chips.push({ label: 'Referral', kind: 'default' })
    else if (v.source === 'social') chips.push({ label: 'Social', kind: 'default' })
    else if (v.source === 'ads') chips.push({ label: 'Ads', kind: 'default' })
  }

  return chips
}

const EMPTY_STATS: NonNullable<VisitsListProps['stats']> = {
  total: 0,
  today: 0,
  week: 0,
  month: 0,
  ads: 0,
  organic: 0,
  social: 0,
  direct: 0,
  referral: 0,
  adsPct: 0,
  organicPct: 0,
  socialPct: 0,
  directPct: 0,
  referralPct: 0,
  fb: 0,
  insta: 0,
  google: 0,
  tiktok: 0,
  sampleSize: 0,
  bouncePct: 0,
  conversionPct: 0,
  avgPages: 0,
  funnel: {
    sessions: 0,
    viewProduct: 0,
    addToCart: 0,
    beginCheckout: 0,
    purchase: 0,
  },
  topLanding: [],
  topCampaigns: [],
  topCities: [],
  devices: { mobile: 0, desktop: 0, tablet: 0 },
}

export default function VisitsListClient({ initialVisits, stats }: VisitsListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const safe = initialVisits || {
    docs: [],
    totalDocs: 0,
    totalPages: 1,
    page: 1,
  }

  const visits = safe.docs
  const currentPage = safe.page
  const totalPages = safe.totalPages
  const totalDocs = safe.totalDocs

  const search = searchParams.get('search') || ''
  const source = searchParams.get('source') || ''
  const sort = searchParams.get('sort') || '-startedAt'

  const [searchValue, setSearchValue] = useState(search)

  // Stats come from the server on first paint (no "…" / client fetch)
  const kpi = stats || EMPTY_STATS

  const funnel = kpi.funnel || {
    sessions: 0,
    viewProduct: 0,
    addToCart: 0,
    beginCheckout: 0,
    purchase: 0,
  }
  const funnelRate = (n: number) =>
    funnel.sessions > 0 ? Math.round((n / funnel.sessions) * 100) : 0

  const visitTitle = (v: VisitDoc) => {
    if (v.displayTitle) return v.displayTitle
    return SOURCE_LABELS[v.source || ''] || v.source || 'Visite'
  }


  const updateFilters = useCallback(
    (updates: Record<string, string | number>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, String(value))
        else params.delete(key)
      })
      startTransition(() => {
        // replace: filters/search should not pollute browser history
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      })
    },
    [pathname, router, searchParams],
  )

  useEffect(() => {
    setSearchValue(search)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== search) {
        updateFilters({ search: searchValue, page: 1 })
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchValue, search, updateFilters])

  const openVisit = (id: string) => {
    router.push(`/admin/collections/visits/${id}`)
  }

  const eventCount = (v: VisitDoc) =>
    Array.isArray(v.events) ? v.events.length : 0

  const hasAdsSignal = (v: VisitDoc) =>
    Boolean(
      v.fbclid || v.gclid || v.ttclid || v.msclkid || v.source === 'ads',
    )

  return (
    <div className="visits-list-wrapper">
      {/* Header */}
      <div className="visits-list-header">
        <div className="visits-list-header-left">
          <h1 className="visits-list-title">Visites</h1>
          <span className="visits-list-count">
            {formatNumber(totalDocs)} session{totalDocs !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Hero — real numbers from server */}
      <div className="visits-stat-grid">
        <div className="visits-stat-card visits-stat-card--today">
          <div className="visits-stat-card-icon" aria-hidden>
            <Sparkles size={18} />
          </div>
          <span className="visits-stat-card-value">{formatNumber(kpi.today)}</span>
          <span className="visits-stat-card-label">Aujourd&apos;hui</span>
          <span className="visits-stat-card-hint">sessions en direct</span>
        </div>

        <div className="visits-stat-card visits-stat-card--week">
          <div className="visits-stat-card-icon" aria-hidden>
            <CalendarDays size={18} />
          </div>
          <span className="visits-stat-card-value">{formatNumber(kpi.week)}</span>
          <span className="visits-stat-card-label">7 derniers jours</span>
          <span className="visits-stat-card-hint">
            {kpi.total
              ? `${Math.round(((kpi.week || 0) / kpi.total) * 100)}% du total`
              : 'fenêtre glissante'}
          </span>
        </div>

        <div className="visits-stat-card visits-stat-card--month">
          <div className="visits-stat-card-icon" aria-hidden>
            <CalendarRange size={18} />
          </div>
          <span className="visits-stat-card-value">
            {formatNumber(kpi.month ?? 0)}
          </span>
          <span className="visits-stat-card-label">30 derniers jours</span>
          <span className="visits-stat-card-hint">
            {kpi.week
              ? `~${Math.max(1, Math.round((kpi.month ?? 0) / Math.max(kpi.week, 1)))}× la semaine`
              : 'fenêtre glissante'}
          </span>
        </div>

     
        <div className="visits-stat-card visits-stat-card--pages">
          <div className="visits-stat-card-icon" aria-hidden>
            <Layers size={18} />
          </div>
          <span className="visits-stat-card-value">{kpi.avgPages ?? 0}</span>
          <span className="visits-stat-card-label">Pages / session</span>
          <span className="visits-stat-card-hint">profondeur de parcours</span>
        </div>

      </div>

      {/* Sources + channels */}
      <div className="visits-hero visits-hero--sources">
        <div className="visits-hero-split">
          <div className="visits-hero-bar">
            <div className="visits-hero-bar-labels">
              <span>Mix des sources</span>
              <span>
                Ads {kpi.adsPct ?? 0}% · SEO {kpi.organicPct ?? 0}% · Social{' '}
                {kpi.socialPct ?? 0}% · Site {kpi.directPct ?? 0}% · Referral{' '}
                {kpi.referralPct ?? 0}%
              </span>
            </div>
            <div className="visits-hero-bar-track">
              {(
                [
                  {
                    key: 'ads',
                    pct: kpi.adsPct || 0,
                    count: kpi.ads,
                    label: 'Ads',
                    cls: 'visits-hero-bar-seg--ads',
                  },
                  {
                    key: 'organic',
                    pct: kpi.organicPct || 0,
                    count: kpi.organic,
                    label: 'SEO',
                    cls: 'visits-hero-bar-seg--organic',
                  },
                  {
                    key: 'social',
                    pct: kpi.socialPct || 0,
                    count: kpi.social,
                    label: 'Social',
                    cls: 'visits-hero-bar-seg--social',
                  },
                  {
                    key: 'direct',
                    pct: kpi.directPct || 0,
                    count: kpi.direct,
                    label: 'Site',
                    cls: 'visits-hero-bar-seg--direct',
                  },
                  {
                    key: 'referral',
                    pct: kpi.referralPct || 0,
                    count: kpi.referral,
                    label: 'Referral',
                    cls: 'visits-hero-bar-seg--referral',
                  },
                ] as const
              )
                .filter((s) => s.pct > 0)
                .map((s, i, arr) => (
                  <div
                    key={s.key}
                    className={`visits-hero-bar-seg ${s.cls}`}
                    style={{
                      width: `${s.pct}%`,
                      borderRadius:
                        arr.length === 1
                          ? '999px'
                          : i === 0
                            ? '999px 0 0 999px'
                            : i === arr.length - 1
                              ? '0 999px 999px 0'
                              : '0',
                    }}
                    title={`${s.label}: ${s.count} (${s.pct}%)`}
                  />
                ))}
            </div>
            <div className="visits-hero-pills">
              <span className="visits-pill visits-pill--ads">
                Ads {formatNumber(kpi.ads || 0)}
              </span>
              <span className="visits-pill visits-pill--organic">
                SEO {formatNumber(kpi.organic || 0)}
              </span>
              <span className="visits-pill visits-pill--social">
                Social {formatNumber(kpi.social || 0)}
              </span>
              <span className="visits-pill visits-pill--direct">
                Site {formatNumber(kpi.direct || 0)}
              </span>
              <span className="visits-pill visits-pill--referral">
                Referral {formatNumber(kpi.referral || 0)}
              </span>
            </div>
          </div>
          <div className="visits-channel-row">
            <span className="visits-channel-label">Canaux pubs (click IDs)</span>
            <div className="visits-channel-chips">
              <span className="visits-utm-chip visits-utm-chip--fb">
                FB {formatNumber(kpi.fb || 0)}
              </span>
              <span className="visits-utm-chip visits-utm-chip--ig">
                Insta {formatNumber(kpi.insta || 0)}
              </span>
              <span className="visits-utm-chip visits-utm-chip--g">
                Google {formatNumber(kpi.google || 0)}
              </span>
              <span className="visits-utm-chip visits-utm-chip--tt">
                TikTok {formatNumber(kpi.tiktok || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Funnel */}
      <div className="visits-funnel">
        <div className="visits-funnel-title">
          Entonnoir
          <span className="visits-funnel-note">
            sur {formatNumber(funnel.sessions)} sessions récentes
          </span>
        </div>
        <div className="visits-funnel-steps">
          {[
            { key: 'sessions', label: 'Sessions', n: funnel.sessions },
            { key: 'view', label: 'Vue produit', n: funnel.viewProduct },
            { key: 'atc', label: 'Panier', n: funnel.addToCart },
            { key: 'co', label: 'Début cmd', n: funnel.beginCheckout },
            { key: 'buy', label: 'Achat', n: funnel.purchase },
          ].map((step, i, arr) => (
            <div key={step.key} className="visits-funnel-step">
              {i > 0 ? <span className="visits-funnel-arrow">→</span> : null}
              <div className="visits-funnel-card">
                <span className="visits-funnel-value">{formatNumber(step.n)}</span>
                <span className="visits-funnel-label">{step.label}</span>
                <span className="visits-funnel-rate">{funnelRate(step.n)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top lists */}
      <div className="visits-tops">
        <div className="visits-top-card">
          <h3 className="visits-top-title">Landing pages</h3>
          {(kpi.topLanding || []).length === 0 ? (
            <p className="visits-top-empty">Pas encore de données</p>
          ) : (
            <ul className="visits-top-list">
              {(kpi.topLanding || []).map((row) => (
                <li key={row.label}>
                  <span className="visits-top-label" title={row.label}>
                    {truncate(row.label, 36)}
                  </span>
                  <span className="visits-top-count">{formatNumber(row.count)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="visits-top-card">
          <h3 className="visits-top-title">Villes</h3>
          {(kpi.topCities || []).length === 0 ? (
            <p className="visits-top-empty">Géo non dispo (local)</p>
          ) : (
            <ul className="visits-top-list">
              {(kpi.topCities || []).map((row) => (
                <li key={row.label}>
                  <span className="visits-top-label">{truncate(row.label, 28)}</span>
                  <span className="visits-top-count">{formatNumber(row.count)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="visits-top-card">
          <h3 className="visits-top-title">Appareils</h3>
          <ul className="visits-top-list">
            <li>
              <span className="visits-top-label">Mobile</span>
              <span className="visits-top-count">{formatNumber(kpi.devices?.mobile || 0)}</span>
            </li>
            <li>
              <span className="visits-top-label">Desktop</span>
              <span className="visits-top-count">{formatNumber(kpi.devices?.desktop || 0)}</span>
            </li>
            <li>
              <span className="visits-top-label">Tablette</span>
              <span className="visits-top-count">{formatNumber(kpi.devices?.tablet || 0)}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Filters */}
      <div className="visits-filters">
        <div className="visits-search">
          <Search size={16} className="visits-search-icon" />
          <input
            type="text"
            className="visits-search-input"
            placeholder="IP, campagne, ville, fbclid, page…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          {searchValue ? (
            <button
              type="button"
              className="visits-search-clear"
              onClick={() => {
                setSearchValue('')
                updateFilters({ search: '', page: 1 })
              }}
              aria-label="Effacer"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <div className="visits-filter-group">
          <select
            className="visits-select"
            value={source}
            onChange={(e) => updateFilters({ source: e.target.value, page: 1 })}
          >
            <option value="">Toutes les sources</option>
            <option value="organic">Organic (SEO)</option>
            <option value="ads">Ads</option>
            <option value="social">Social</option>
            <option value="referral">Referral</option>
            <option value="direct">Site</option>

          </select>

          <select
            className="visits-select"
            value={sort}
            onChange={(e) => updateFilters({ sort: e.target.value, page: 1 })}
          >
            <option value="-startedAt">Plus récentes</option>
            <option value="startedAt">Plus anciennes</option>
            <option value="-pageViews">Pages vues ↓</option>
            <option value="-lastSeenAt">Dernière activité</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={`visits-table-container ${isPending ? 'is-pending' : ''}`}>
        <table className="visits-table">
          <thead>
            <tr>
              <th>Visiteur</th>
              <th>Source</th>
              <th>Première page</th>
              <th>Attribution</th>
              <th>Activité</th>
              <th>Début</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visits.length === 0 ? (
              <tr>
                <td colSpan={7} className="visits-empty">
                  Aucune visite trouvée
                </td>
              </tr>
            ) : (
              visits.map((v) => (
                <tr
                  key={v.id}
                  className="visits-table-row"
                  onClick={() => openVisit(v.id)}
                >
                  <td>
                    <div className="visits-visitor">
                      <div className="visits-visitor-title">{visitTitle(v)}</div>
                      <div className="visits-visitor-meta">
                        {[v.location?.city, v.location?.country]
                          .filter(Boolean)
                          .join(', ') || 'Lieu inconnu'}
                        {v.deviceType || v.browser
                          ? ` · ${[v.deviceType, v.browser].filter(Boolean).join(' · ')}`
                          : ''}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`visits-source-badge visits-source-badge--${v.source || 'organic'}`}
                    >
                      {SOURCE_LABELS[v.source || ''] || v.source || '—'}
                    </span>
                    {hasAdsSignal(v) && (
                      <span className="visits-ads-dot" title="Signal pub (fbclid/gclid)" />
                    )}
                  </td>
                  <td>
                    <span
                      className="visits-first-page"
                      title={v.firstPage || undefined}
                    >
                      {v.firstPage ? truncate(v.firstPage, 28) : '—'}
                    </span>
                  </td>
                  <td>
                    <div className="visits-utm">
                      {(() => {
                        const chips = getAttributionChips(v)
                        if (!chips.length) {
                          return <span className="visits-muted">—</span>
                        }
                        return chips.map((chip, i) => (
                          <span
                            key={`${chip.label}-${i}`}
                            className={
                              chip.kind === 'ig'
                                ? 'visits-utm-chip visits-utm-chip--ig'
                                : chip.kind === 'fb'
                                  ? 'visits-utm-chip visits-utm-chip--fb'
                                  : chip.kind === 'g'
                                    ? 'visits-utm-chip visits-utm-chip--g'
                                    : chip.kind === 'tt'
                                      ? 'visits-utm-chip visits-utm-chip--tt'
                                      : chip.kind === 'camp'
                                        ? 'visits-utm-chip visits-utm-chip--camp'
                                        : 'visits-utm-chip'
                            }
                          >
                            {chip.label}
                          </span>
                        ))
                      })()}
                    </div>
                  </td>
                  <td>
                    <div className="visits-activity">
                      <span className="visits-pv">
                        <Eye size={12} /> {v.pageViews ?? 1} page
                        {(v.pageViews ?? 1) > 1 ? 's' : ''}
                      </span>
                      {eventCount(v) > 0 ? (
                        <span className="visits-ev">
                          <MousePointerClick size={12} /> {eventCount(v)} evt
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <div className="visits-date">{formatDate(v.startedAt)}</div>
                    {v.lastSeenAt && v.lastSeenAt !== v.startedAt ? (
                      <div className="visits-date-sub">
                        vu {formatDate(v.lastSeenAt)}
                      </div>
                    ) : null}
                  </td>
                  <td className="visits-action-cell">
                    <button
                      type="button"
                      className="visits-open-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        openVisit(v.id)
                      }}
                      title="Ouvrir"
                      aria-label="Ouvrir la visite"
                    >
                      <ExternalLink size={14} strokeWidth={2} aria-hidden />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination — always visible when there are results */}
      {totalDocs > 0 ? (
        <div className="visits-pagination">
          <span className="visits-page-total">
            {formatNumber(totalDocs)} visite{totalDocs !== 1 ? 's' : ''}
          </span>
          <div className="visits-pagination-controls">
            <button
              type="button"
              className="visits-page-btn"
              disabled={currentPage <= 1 || isPending || totalPages <= 1}
              onClick={() => updateFilters({ page: Math.max(1, currentPage - 1) })}
              aria-label="Page précédente"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              // Window of pages around current
              let pageNum = i + 1
              if (totalPages > 7) {
                const start = Math.max(1, Math.min(currentPage - 3, totalPages - 6))
                pageNum = start + i
              }
              if (pageNum > totalPages) return null
              return (
                <button
                  key={pageNum}
                  type="button"
                  className={`visits-page-num${pageNum === currentPage ? ' is-active' : ''}`}
                  disabled={isPending}
                  onClick={() => updateFilters({ page: pageNum })}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              type="button"
              className="visits-page-btn"
              disabled={currentPage >= totalPages || isPending || totalPages <= 1}
              onClick={() => updateFilters({ page: Math.min(totalPages, currentPage + 1) })}
              aria-label="Page suivante"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <span className="visits-page-info">
            Page {currentPage} / {Math.max(totalPages, 1)}
          </span>
        </div>
      ) : null}
    </div>
  )
}
