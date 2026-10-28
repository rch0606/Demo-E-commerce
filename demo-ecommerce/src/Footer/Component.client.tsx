'use client'

import { ArrowUpRight, MessageCircle, ShieldCheck, Truck, Wallet } from 'lucide-react'

import { useLocale } from '@/lib/locale-context'
import { CMSLink } from '@/components/Link'
import Icon from '@/components/Icon'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import { trackClickWhatsApp } from '@/lib/analytics'

import type {
  Category,
  Footer as FooterType,
} from '@/payload-types'
import { Media } from '@/components/Media'
import { BrandLogo } from '@/components/BrandLogo'


type Props = {
  footer: FooterType
  categories: Category[]
}

const eyebrow = 'text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground'

export function FooterClient({
  footer,
  categories,
}: Props) {
  const { t } = useLocale()

  const description = footer.description
  const categoriesTitle = footer.categoriesTitle
  const contactsTitle = footer.contactsTitle
  const socialTitle = footer.socialTitle
  const whatsappNumber = footer?.whatsappnumber
  const developerName =
    (footer as any).developerName || 'Rktec Solution'
  const developerUrl = (footer as any).developerUrl as string | null | undefined

  const socialLinks = footer.socialLinks ?? []
  const hasSocial = socialLinks.length > 0 || Boolean(whatsappNumber)

  // Petits engagements (livraison, paiement) repris des dictionnaires existants.
  const services = [
    t?.featDeliveryTitle && { icon: Truck, title: t.featDeliveryTitle, desc: t.featDeliveryDesc },
    t?.promoTrustPayment && { icon: Wallet, title: t.promoTrustPayment, desc: null },
    t?.featPaymentTitle && { icon: ShieldCheck, title: t.featPaymentTitle, desc: t.featPaymentDesc },
  ].filter(Boolean) as Array<{ icon: typeof Truck; title: string; desc?: string | null }>

  return (
    <>
    <footer className="mt-20 rounded-t-[2.5rem] bg-brand-mist text-foreground">

      {/* TOP BAND — grande phrase + réseaux */}
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6 md:pt-16 lg:px-8">
        <div className="flex flex-col gap-10 border-b border-border pb-12 md:flex-row md:items-end md:justify-between">
          {description && (
            <p className="max-w-2xl font-heading text-2xl font-normal leading-snug text-foreground text-balance sm:text-3xl md:text-[2.25rem] md:leading-[1.2]">
              {description}
            </p>
          )}

          {hasSocial && (
            <div className="flex shrink-0 flex-col gap-4 md:items-end">
              {socialTitle && <p className={eyebrow}>{socialTitle}</p>}
              <div className="flex flex-wrap items-center gap-2">
                {socialLinks.map((item, index) => (
                  <a
                    key={index}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Social link ${index + 1}`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-brand-pink hover:bg-brand-haze"
                  >
                    {item.icon && (
                      <Icon
                        name={item?.icon}
                        className="h-[18px] w-[18px]"
                        strokeWidth={1.5}
                      />
                    )}
                  </a>
                ))}

                {/* WhatsApp (lien du footer) */}
                {whatsappNumber && (
                  <a
                    href={`https://wa.me/${whatsappNumber.replace(/\s/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackClickWhatsApp()}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MIDDLE — colonnes */}
        <div className="grid gap-10 pt-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">

          {/* Marque */}
          <div className="lg:col-span-3">
            <div className="relative h-9 w-28 flex-shrink-0 [&_img]:!static [&_img]:h-full [&_img]:w-auto [&_img]:object-contain">
              {footer.logo && typeof footer.logo === 'object' ? (
                <Media
                  resource={footer.logo}
                  alt={footer.logo.alt || 'Logo'}
                  fill={false}
                  pictureClassName="bg-transparent"
                  imgClassName="bg-transparent object-contain"
                  priority
                />
              ) : (
                <BrandLogo className="text-3xl" />
              )}
            </div>
          </div>

          {/* Catégories */}
          <div className="lg:col-span-3">
            {categoriesTitle && <h3 className={`${eyebrow} mb-4`}>{categoriesTitle}</h3>}

            <ul className="grid gap-2.5 text-sm">
              {categories && categories?.slice(0, 6).map((category) => (
                <li key={category?.id}>
                  <CMSLink
                    reference={{
                      relationTo: 'categories',
                      value: category
                    }}
                    className="text-foreground/80 no-underline transition-colors hover:text-foreground hover:underline hover:decoration-brand-pink hover:underline-offset-4"
                  >
                    {category.title}
                  </CMSLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacts */}
          <div className="lg:col-span-3">
            {contactsTitle && <h3 className={`${eyebrow} mb-4`}>{contactsTitle}</h3>}

            <ul className="grid gap-3 text-sm">
              {footer?.contacts?.map((item, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3"
                >
                  {item.icon && (
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card ring-1 ring-border">
                      <Icon
                        name={item.icon}
                        className="h-3.5 w-3.5 text-primary"
                        strokeWidth={1.5}
                      />
                    </span>
                  )}

                  {item.link && (
                    <CMSLink
                      {...item.link}
                      className="text-foreground/80 no-underline transition-colors hover:text-foreground"
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Livraison & paiement */}
          {services.length > 0 && (
            <div className="lg:col-span-3">
              <ul className="grid gap-3">
                {services.map(({ icon: ServiceIcon, title, desc }) => (
                  <li key={title} className="flex items-start gap-3 rounded-2xl bg-background/70 p-3 ring-1 ring-border/70">
                    <ServiceIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" strokeWidth={1.5} aria-hidden />
                    <span className="text-sm leading-snug">
                      <span className="block text-foreground">{title}</span>
                      {desc && <span className="block text-xs text-muted-foreground">{desc}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM BAR — copyright + liens légaux */}
      <div className="border-t border-border bg-brand-haze/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          {/* French-style credit */}
          <p className="text-center sm:text-start">
            ©️ {new Date().getFullYear()}{' '}
            {developerUrl ? (
              <a
                href={developerUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-foreground underline-offset-4 transition-colors hover:underline hover:decoration-brand-pink"
              >
                {developerName}
              </a>
            ) : (
              <span className="text-foreground">{developerName}</span>
            )}
            . Tous Droits Réservés.
          </p>

          {/* Legal links */}
          <nav
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:justify-end"
            aria-label="Liens légaux"
          >
            <CMSLink
              url="/conditions-generales-de-vente"
              className="inline-flex items-center gap-1 no-underline transition-colors hover:text-foreground"
            >
              Conditions Générales de Vente
              <ArrowUpRight className="h-3 w-3 rtl:-scale-x-100" strokeWidth={1.5} aria-hidden />
            </CMSLink>
          </nav>
        </div>
      </div>
    </footer>

    {/* Floating social FAB — expands to WhatsApp + social links */}
    <WhatsAppButton
      phoneNumber={whatsappNumber || undefined}
      socialLinks={(footer.socialLinks || [])
        .filter((l) => Boolean(l?.url))
        .map((l) => ({
          icon: l?.icon ?? null,
          url: String(l?.url),
        }))}
    />

    </>
  )
}
