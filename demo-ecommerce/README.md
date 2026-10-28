# Demo e-commerce (white-label)

Full e-commerce site built on Payload CMS 3 + Next.js 16, branded as **Sable**,
a fictional multi-category store (high-tech, home, beauty, sport, fashion, kitchen).
The storefront is in FR / EN / AR, has a cart, cash-on-delivery checkout,
favourites, reviews and search. The admin covers orders, stock, customers,
revenue, visits, promo codes and SEO.

## Run it locally

Requires Node 20+ and a local MongoDB.

```bash
cp .env.example .env        # then fill PAYLOAD_SECRET, SEED_ADMIN_PASSWORD…
npm install
npm run seed:demo           # empty database only; use -- --reset to start over
npm run dev
```

- Shop: http://localhost:3000/fr
- Admin: http://localhost:3000/admin (account = `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`)

Restart `npm run dev` after a reseed, because the header and footer are cached.

## Make a new demo from it

1. **Name, URL, logos**: edit `src/brand.config.ts` and replace `public/brand/logo.svg` and `icon.svg`.
2. **Colours**: the `--brand-*` and `--primary` variables in `src/app/(frontend)/globals.css`,
   and the `--dt-accent*` variables in `src/app/(payload)/custom.scss` for the admin.
3. **Content**: edit the data at the top of `src/scripts/seedDemo.ts` (categories,
   products, colours, sizes, homepage texts), then run `npm run seed:demo -- --reset`.
   Product photos are generated locally (`src/scripts/demoImages.ts`). Replace
   them in the admin with real photos when you have them.
4. **Fixed UI texts**: `src/dictionnaries/{fr,en,ar}.ts`.
5. Use a different `DATABASE_URL` for each demo.

## Optional integrations

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel (disabled when empty) |
| `GOOGLE_SITE_VERIFICATION` | Google Search Console token |
| `GOOGLE_MERCHANT_*` | Google Merchant Center product sync |

## Still tied to the Tunisian market

Currency (TND / DT), the governorate list in checkout and the `Africa/Tunis`
timezone are still hardcoded across the code base.
