import { getServerSideURL } from '@/utilities/getURL'

export const dynamic = 'force-dynamic'

const ALLOW = ['/', '/api/media/', '/_next/image', '/_next/static/']
const DISALLOW = ['/admin/', '/api/', '/next/']

const group = (userAgent: string) =>
  [
    `User-agent: ${userAgent}`,
    ...ALLOW.map((path) => `Allow: ${path}`),
    ...DISALLOW.map((path) => `Disallow: ${path}`),
  ].join('\n')

export async function GET() {
  const SITE_URL = getServerSideURL()

  const body = [
    group('*'),
    '',
    group('Googlebot'),
    '',
    group('Googlebot-Image'),
    '',
    `Host: ${SITE_URL}`,
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    `Sitemap: ${SITE_URL}/pages-sitemap.xml`,
    `Sitemap: ${SITE_URL}/products-sitemap.xml`,
    '',
  ].join('\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
