/**
 * Parse a User-Agent string into readable browser / OS / device fields.
 * Requires: npm i ua-parser-js
 * Types (optional): npm i -D @types/ua-parser-js
 */
import { UAParser } from 'ua-parser-js'

export type ParsedUserAgent = {
  /** Full original UA (truncated) */
  userAgent: string | null
  /** e.g. "Chrome" */
  browser: string | null
  /** e.g. "151.0.0.0" */
  browserVersion: string | null
  /** e.g. "Chrome 151" */
  browserLabel: string | null
  /** e.g. "Windows" */
  os: string | null
  /** e.g. "10" */
  osVersion: string | null
  /** e.g. "Windows 10" */
  osLabel: string | null
  /** desktop | mobile | tablet | unknown */
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  /** Vendor model if known, e.g. "iPhone" */
  device: string | null
}

export function parseUserAgent(raw?: string | null): ParsedUserAgent {
  const userAgent = raw ? String(raw).slice(0, 500) : null

  if (!userAgent) {
    return {
      userAgent: null,
      browser: null,
      browserVersion: null,
      browserLabel: null,
      os: null,
      osVersion: null,
      osLabel: null,
      deviceType: 'unknown',
      device: null,
    }
  }

  const parser = new UAParser(userAgent)
  const result = parser.getResult()

  const browserName = result.browser.name || null
  const browserVersion = result.browser.version || null
  const osName = result.os.name || null
  const osVersion = result.os.version || null

  // ua-parser device.type is often empty for desktops
  let deviceType: ParsedUserAgent['deviceType'] = 'unknown'
  const rawType = (result.device.type || '').toLowerCase()
  if (rawType === 'mobile') deviceType = 'mobile'
  else if (rawType === 'tablet') deviceType = 'tablet'
  else if (browserName || osName) deviceType = 'desktop'

  const deviceParts = [result.device.vendor, result.device.model].filter(Boolean)
  const device = deviceParts.length > 0 ? deviceParts.join(' ') : null

  const browserLabel =
    browserName && browserVersion
      ? `${browserName} ${browserVersion.split('.')[0]}`
      : browserName

  const osLabel =
    osName && osVersion ? `${osName} ${osVersion}` : osName

  return {
    userAgent,
    browser: browserName,
    browserVersion,
    browserLabel,
    os: osName,
    osVersion,
    osLabel,
    deviceType,
    device,
  }
}
