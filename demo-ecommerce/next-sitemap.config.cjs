/**
 * Static sitemap/robots generation is disabled on purpose.
 *
 * next-sitemap runs at build time, so it baked whatever NEXT_PUBLIC_SERVER_URL
 * happened to be set to into `public/robots.txt` and `public/sitemap*.xml`
 * (in practice `http://localhost:3000`). Files in `public/` also take
 * precedence over app routes, so those stale files shadowed the real ones.
 *
 * Everything is now served dynamically from the app router:
 *   /robots.txt            -> src/app/(frontend)/(sitemaps)/robots.txt/route.ts
 *   /sitemap.xml           -> src/app/(frontend)/(sitemaps)/sitemap.xml/route.ts
 *   /pages-sitemap.xml     -> src/app/(frontend)/(sitemaps)/pages-sitemap.xml/route.ts
 *   /products-sitemap.xml  -> src/app/(frontend)/(sitemaps)/products-sitemap.xml/route.ts
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  'https://demo.sable-store.tn'

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: SITE_URL,
  generateRobotsTxt: false,
  generateIndexSitemap: false,
  exclude: ['/*'],
}
