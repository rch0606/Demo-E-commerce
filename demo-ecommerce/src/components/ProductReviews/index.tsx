'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, PenLine } from 'lucide-react'
import type { Review } from '@/payload-types'
import { useLocale } from '@/lib/locale-context'
import { StarRating, StarRatingInput } from '@/components/StarRating'

export type PublicReview = Pick<Review, 'id' | 'rating' | 'title' | 'comment' | 'authorName' | 'createdAt'>

export type ProductReviewsPage = {
  docs: PublicReview[]
  totalDocs: number
}

const PAGE_SIZE = 5

const DATE_LOCALES = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-TN' } as const

const ERROR_KEYS = {
  invalid_rating: 'errorRating',
  invalid_name: 'errorName',
  comment_too_short: 'errorComment',
  invalid_email: 'errorEmail',
  already_reviewed: 'errorAlready',
  too_many_reviews: 'errorTooMany',
} as const

export function ProductReviews({
  productId,
  averageRating,
  reviewCount,
  initialReviews,
}: {
  productId: string
  averageRating: number
  reviewCount: number
  initialReviews: ProductReviewsPage
}) {
  const { locale, t } = useLocale()
  const tr = t.productReviews

  const [reviews, setReviews] = useState(initialReviews.docs)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const hasMore = reviews.length < initialReviews.totalDocs

  const [formOpen, setFormOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [authorName, setAuthorName] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [website, setWebsite] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // Répartition des notes : calculée sur tous les avis approuvés (une seule
  // requête légère), à défaut sur ceux déjà chargés.
  const [allRatings, setAllRatings] = useState<number[] | null>(
    initialReviews.docs.length >= initialReviews.totalDocs ? initialReviews.docs.map((r) => r.rating) : null,
  )

  useEffect(() => {
    if (allRatings || initialReviews.totalDocs === 0) return
    const controller = new AbortController()
    const params = new URLSearchParams({
      'where[product][equals]': productId,
      limit: '500',
      depth: '0',
      'select[rating]': 'true',
    })
    fetch(`/api/reviews?${params}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.docs) setAllRatings(data.docs.map((r: { rating: number }) => Number(r.rating) || 0))
      })
      .catch(() => {})
    return () => controller.abort()
  }, [allRatings, initialReviews.totalDocs, productId])

  const distribution = useMemo(() => {
    const ratings = allRatings ?? reviews.map((r) => r.rating)
    const total = ratings.length || 1
    return [5, 4, 3, 2, 1].map((star) => {
      const count = ratings.filter((r) => Math.round(r) === star).length
      return { star, count, percent: (count / total) * 100 }
    })
  }, [allRatings, reviews])

  const countLabel =
    reviewCount === 1 ? tr.oneReview : tr.reviewsCount.replace('{count}', String(reviewCount))

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(DATE_LOCALES[locale] ?? 'fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const params = new URLSearchParams({
        'where[product][equals]': productId,
        sort: '-createdAt',
        limit: String(PAGE_SIZE),
        page: String(page + 1),
        depth: '0',
      })
      const res = await fetch(`/api/reviews?${params}`)
      if (res.ok) {
        const data = await res.json()
        setReviews((current) => [...current, ...(data.docs ?? [])])
        setPage((current) => current + 1)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (rating < 1) return setError(tr.errorRating)
    if (authorName.trim().length < 2) return setError(tr.errorName)
    if (comment.trim().length < 10) return setError(tr.errorComment)

    setSending(true)
    try {
      const res = await fetch('/api/submit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, rating, authorName, email, title, comment, locale, website }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok && data.ok) {
        setSubmitted(true)
        setFormOpen(false)
      } else {
        const key = ERROR_KEYS[data.error as keyof typeof ERROR_KEYS]
        setError(key ? tr[key] : tr.errorGeneric)
      }
    } catch {
      setError(tr.errorGeneric)
    } finally {
      setSending(false)
    }
  }

  const inputClass =
    'h-12 w-full rounded-full border border-input bg-card px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground/40 focus:ring-0'
  const labelClass = 'block text-[13px] text-muted-foreground'
  const secondaryButton =
    'h-12 rounded-full border border-foreground/15 bg-transparent px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50'

  return (
    <section id="avis" className="mt-20 scroll-mt-32 border-t border-border pt-16 md:mt-24 md:pt-20">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
        {/* Résumé : moyenne, étoiles, répartition. */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          {reviewCount > 0 && (
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {countLabel}
            </p>
          )}
          <h2 className="font-heading text-3xl font-normal leading-tight tracking-tight text-foreground md:text-4xl">
            {tr.title}
          </h2>

          {reviewCount > 0 ? (
            <div className="mt-8">
              <div className="flex items-end gap-4">
                <span className="font-heading text-6xl font-normal leading-none text-foreground">
                  {averageRating.toLocaleString(DATE_LOCALES[locale] ?? 'fr-FR', { maximumFractionDigits: 1 })}
                </span>
                <div className="flex flex-col gap-1.5 pb-1">
                  <StarRating value={averageRating} starClassName="h-4 w-4" />
                  <span className="text-[13px] text-muted-foreground">{tr.outOf5}</span>
                </div>
              </div>

              <ul className="mt-6 space-y-2.5">
                {distribution.map(({ star, count, percent }) => (
                  <li key={star} className="flex items-center gap-3 text-[13px] text-muted-foreground">
                    <span className="w-3 shrink-0 tabular-nums">{star}</span>
                    <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-brand-mist">
                      <span
                        className="absolute inset-y-0 start-0 rounded-full bg-primary/70"
                        style={{ width: `${percent}%` }}
                      />
                    </span>
                    <span className="w-6 shrink-0 text-end tabular-nums">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground">{tr.noReviews}</p>
          )}

          {!formOpen && !submitted && (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className={`${secondaryButton} mt-8 inline-flex items-center gap-2`}
            >
              <PenLine className="h-4 w-4" strokeWidth={1.5} />
              {tr.writeReview}
            </button>
          )}
        </div>

        <div className="min-w-0">
          {submitted && (
            <p className="mb-6 flex items-center gap-3 rounded-2xl bg-brand-mist px-5 py-4 text-sm text-foreground">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-green" strokeWidth={1.5} />
              {tr.thanks}
            </p>
          )}

          {formOpen && (
            <form onSubmit={submit} noValidate className="relative mb-10 space-y-5 rounded-3xl bg-brand-mist p-6 md:p-8">
              <div>
                <p className={`${labelClass} mb-2`}>{tr.yourRating}</p>
                <StarRatingInput value={rating} onChange={setRating} label={tr.yourRating} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className={labelClass}>
                  {tr.name}
                  <input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    maxLength={60}
                    autoComplete="name"
                    className={`${inputClass} mt-2`}
                  />
                </label>
                <label className={labelClass}>
                  {tr.email}
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={120}
                    autoComplete="email"
                    className={`${inputClass} mt-2`}
                  />
                </label>
              </div>

              <label className={labelClass}>
                {tr.reviewTitle}
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  className={`${inputClass} mt-2`}
                />
              </label>

              <label className={labelClass}>
                {tr.comment}
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={2000}
                  rows={5}
                  placeholder={tr.commentPlaceholder}
                  className="mt-2 w-full resize-y rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground/40 focus:ring-0"
                />
              </label>

              {/* Champ piège anti-robots : invisible et ignoré par les humains. */}
              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
              />

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="submit"
                  disabled={sending}
                  className="h-12 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {sending ? tr.sending : tr.submit}
                </button>
                <button type="button" onClick={() => setFormOpen(false)} className={secondaryButton}>
                  {tr.cancel}
                </button>
              </div>
            </form>
          )}

          {reviews.length > 0 && (
            <ul className="divide-y divide-border border-y border-border">
              {reviews.map((review) => (
                <li key={review.id} className="py-7">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StarRating value={review.rating} starClassName="h-3.5 w-3.5" />
                    <time dateTime={review.createdAt} className="text-[13px] text-muted-foreground">
                      {formatDate(review.createdAt)}
                    </time>
                  </div>
                  {review.title && (
                    <p className="mt-3 font-heading text-lg font-normal text-foreground">{review.title}</p>
                  )}
                  <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
                    {review.comment}
                  </p>
                  <p className="mt-4 text-[13px] font-medium text-foreground">{review.authorName}</p>
                </li>
              ))}
            </ul>
          )}

          {hasMore && (
            <button type="button" onClick={loadMore} disabled={loadingMore} className={`${secondaryButton} mt-6`}>
              {tr.showMore}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
