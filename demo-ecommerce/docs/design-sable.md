# Sable design system (storefront)

Shared brief for every storefront redesign. The goal: a calm, modern store that
has its own identity. Take inspiration from modern
Shopify themes (Dawn, Sense), Aesop, COS, Everlane, Muji: lots of white, soft
pale peach surfaces, deep coral actions, light coral for promotions, generous spacing, serif titles, thin lines instead of boxes.

## Colours (Tailwind token classes, never hardcode hex)
- `bg-background` / `bg-card`: white. White is dominant everywhere.
- `bg-brand-mist` (#fff6f2) and `bg-muted`: soft pale-peach surfaces (summary panels, image backgrounds, highlighted zones). Use sparingly: at most one tinted zone per screen region.
- `bg-brand-haze` (#fde8de): stronger peach for rare highlights; `bg-brand-blush` (#fcdccc, light coral) for discount and promo accents; `brand-coral` (#f08a6c) for small decorative touches.
- `text-foreground` (#26232b), `text-muted-foreground` for secondary text.
- `bg-primary text-primary-foreground` (deep coral #bb5333): main buttons. Secondary buttons: `border border-foreground/15 bg-transparent hover:bg-muted`.
- `text-brand-pink` (#bb5333, deep coral): icons, links, active states. `brand-green` (sage) for success/in-stock, `brand-gold` for stars, `text-destructive` for errors.
- Ignore any colour coming from the CMS colour pickers (they are saturated); use tokens instead.
- No gradients, no coloured shadows. Shadows at most `shadow-[0_8px_30px_rgba(38,35,43,0.06)]`.

## Typography
- `font-heading` = Fraunces serif, weight 400–500 (`font-normal`/`font-medium`), never bold/extrabold. For page titles, section titles, product titles, totals.
- `font-sans` = DM Sans for everything else.
- Eyebrow labels: `text-[11px] uppercase tracking-[0.18em] text-muted-foreground`.
- Prices: `font-medium text-foreground`; old price `text-muted-foreground line-through`.

## Shapes and layout
- Buttons, pills, inputs: `rounded-full` (inputs may be `rounded-xl` when multi-line). Inputs: `h-12 border border-input bg-card px-4 focus:border-foreground/40 focus:ring-0 outline-none`, labels above in `text-[13px] text-muted-foreground`.
- Panels: `rounded-2xl`/`rounded-3xl`; prefer thin `border-border` lines and dividers over boxed cards.
- Container: `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`; page top padding `pt-8 md:pt-12`.
- Icons: lucide-react, `strokeWidth={1.5}`.
- RTL (Arabic) must keep working: logical utilities (`ms-/me-/ps-/pe-/start-/end-`), `rtl:` variants, mirrored arrows.
- Mobile first; check 375px width.

## Shared building blocks already available
- `@/components/SectionHeading` (badge, title, subtitle, align, action).
- `@/components/ProductCard` (new design: borderless, mist image tile, quick add on hover).
- `@/components/BrandLogo`, `@/components/Icon`, `@/components/Media`, `@/components/Link` (`CMSLink`).
