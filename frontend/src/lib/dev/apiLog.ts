'use client'

type ApiLogEntry = {
  id: string
  ts: number
  durationMs?: number
  method: string
  url: string
  status?: number
  ok?: boolean
  error?: string
  meta?: Record<string, unknown>
}

type Listener = (entry: ApiLogEntry) => void

const listeners = new Set<Listener>()
const buffer: ApiLogEntry[] = []
const MAX_BUFFER = 200

export function onApiLog(cb: Listener) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function getApiLogs() {
  return [...buffer]
}

function emit(entry: ApiLogEntry) {
  buffer.push(entry)
  if (buffer.length > MAX_BUFFER) buffer.shift()
  listeners.forEach((l) => {
    try { l(entry) } catch {}
  })
}

export async function loggedFetch(input: RequestInfo | URL, init?: RequestInit, meta?: Record<string, unknown>) {
  const start = performance.now()
  const method = (init?.method || 'GET').toUpperCase()
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const base: ApiLogEntry = { id, ts: Date.now(), method, url, meta }
  try {
    const res = await fetch(input as any, init)
    const durationMs = Math.round(performance.now() - start)
    const entry: ApiLogEntry = { ...base, durationMs, status: res.status, ok: res.ok }
    emit(entry)
    return res
  } catch (e: any) {
    const durationMs = Math.round(performance.now() - start)
    const entry: ApiLogEntry = { ...base, durationMs, ok: false, error: e?.message || 'network error' }
    emit(entry)
    throw e
  }
}
