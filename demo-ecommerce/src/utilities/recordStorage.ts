/**
 * Disk storage for rrweb session recordings.
 * Layout: uploads/record/{YYYY-MM-DD}/{safeHost}/{roomId}.log.gz
 * Each append is one gzip member holding NDJSON lines (one rrweb event per
 * line); gunzip reads the concatenated members back as a single stream.
 *
 * Recordings are kept RETENTION_DAYS days, then deleted by the
 * `cleanupRecordings` job. One folder per day makes that a directory delete.
 *
 * Legacy layout (uploads/record/{YYYY-MM}/{host}/{roomId}.log, uncompressed)
 * is still readable and is purged by the same job.
 */
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

const BASE = path.join(process.cwd(), 'uploads', 'record')

export const RETENTION_DAYS = 7

/** A single session never grows past this (protects the disk from runaway pages). */
const MAX_SESSION_BYTES = 5 * 1024 * 1024

const DAY_DIR = /^\d{4}-\d{2}-\d{2}$/
const LEGACY_MONTH_DIR = /^\d{4}-\d{2}$/

/** Drop only mouse/touch moves — keep mutations & styles for correct replay */
const DROP_INCREMENTAL_SOURCES = new Set([1, 6])

export function shouldStoreEvent(event: any): boolean {
  if (!event || typeof event !== 'object') return false
  if (event.type === 3) {
    return !DROP_INCREMENTAL_SOURCES.has(event.data?.source)
  }
  // FullSnapshot, Meta, Load, Custom, etc.
  return true
}

function safeHost(host?: string | null): string {
  return (host || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Day folders a session can live in: a visit can start before midnight. */
function recentDayKeys(): string[] {
  const now = Date.now()
  return [0, 1].map((offset) => dayKey(new Date(now - offset * 24 * 60 * 60 * 1000)))
}

function getLogPath(host: string | null | undefined, roomId: string): string {
  const fileName = `${roomId}.log.gz`

  // Keep appending to the session's existing file, even across midnight.
  for (const day of recentDayKeys()) {
    const candidate = path.join(BASE, day, safeHost(host), fileName)
    if (fs.existsSync(candidate)) return candidate
  }

  const dir = path.join(BASE, dayKey(new Date()), safeHost(host))
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, fileName)
}

export function appendEvents(
  host: string | null | undefined,
  roomId: string,
  events: any[],
  meta?: { visitId?: string | null },
): { written: number; path: string; capped?: boolean } {
  const logPath = getLogPath(host, roomId)

  const size = fs.existsSync(logPath) ? fs.statSync(logPath).size : 0
  if (size >= MAX_SESSION_BYTES) return { written: 0, path: logPath, capped: true }

  const lines: string[] = []
  for (const event of events) {
    if (!shouldStoreEvent(event)) continue
    // Room, host and visit are already in the file path / Visits document:
    // only the event and its reception time are stored per line.
    lines.push(JSON.stringify({ visitId: meta?.visitId || null, receivedAt: Date.now(), event }))
  }

  if (lines.length) {
    fs.appendFileSync(logPath, zlib.gzipSync(lines.join('\n') + '\n'))
  }

  return { written: lines.length, path: logPath }
}

/** Find a room's file in any day (or legacy month) folder. */
export function findLogFileByRoom(roomId: string): {
  filePath: string
  folder: string
  host: string
  roomId: string
} | null {
  if (!fs.existsSync(BASE)) return null

  // Newest folders first: recent sessions are the ones being replayed.
  const folders = fs
    .readdirSync(BASE)
    .filter((name) => DAY_DIR.test(name) || LEGACY_MONTH_DIR.test(name))
    .sort()
    .reverse()

  for (const folder of folders) {
    const folderDir = path.join(BASE, folder)
    if (!fs.statSync(folderDir).isDirectory()) continue

    for (const host of fs.readdirSync(folderDir)) {
      for (const fileName of [`${roomId}.log.gz`, `${roomId}.log`]) {
        const filePath = path.join(folderDir, host, fileName)
        if (fs.existsSync(filePath)) return { filePath, folder, host, roomId }
      }
    }
  }
  return null
}

export function readRoomEvents(roomId: string): {
  roomId: string
  host: string | null
  month: string | null
  events: any[]
} {
  const found = findLogFileByRoom(roomId)
  if (!found) {
    return { roomId, host: null, month: null, events: [] }
  }

  try {
    const buffer = fs.readFileSync(found.filePath)
    const raw = found.filePath.endsWith('.gz') ? zlib.gunzipSync(buffer).toString('utf-8') : buffer.toString('utf-8')

    const events = raw
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line)
        } catch {
          return null
        }
      })
      .filter(Boolean)
      // expose rrweb event for the player (unwrap our envelope)
      .map((entry: any) => entry.event ?? entry)

    return { roomId, host: found.host, month: found.folder, events }
  } catch {
    return { roomId, host: found.host, month: found.folder, events: [] }
  }
}

/**
 * Deletes recordings older than RETENTION_DAYS (whole day folders) and every
 * legacy month folder. Returns what was removed, for the job log.
 */
export function purgeOldRecordings(now = new Date()): { deletedFolders: string[]; freedBytes: number } {
  if (!fs.existsSync(BASE)) return { deletedFolders: [], freedBytes: 0 }

  const cutoff = dayKey(new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000))
  const deletedFolders: string[] = []
  let freedBytes = 0

  const folderSize = (dir: string): number =>
    fs.readdirSync(dir).reduce((total, name) => {
      const entry = path.join(dir, name)
      const stat = fs.statSync(entry)
      return total + (stat.isDirectory() ? folderSize(entry) : stat.size)
    }, 0)

  for (const folder of fs.readdirSync(BASE)) {
    const isExpiredDay = DAY_DIR.test(folder) && folder < cutoff
    const isLegacyMonth = LEGACY_MONTH_DIR.test(folder)
    if (!isExpiredDay && !isLegacyMonth) continue

    const dir = path.join(BASE, folder)
    if (!fs.statSync(dir).isDirectory()) continue

    freedBytes += folderSize(dir)
    fs.rmSync(dir, { recursive: true, force: true })
    deletedFolders.push(folder)
  }

  return { deletedFolders, freedBytes }
}
