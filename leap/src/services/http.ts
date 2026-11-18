/**
 * Digital LEAP — HTTP client helper
 *
 * Thin wrapper around fetch() that:
 *  - Reads the base URL from VITE_API_URL (defaults to http://localhost/digital-leap-backend)
 *  - Sends credentials (session cookie) on every request
 *  - Throws ApiError with the server's error message on non-ok responses
 *  - Returns the `data` field of a successful { ok: true, data: … } envelope
 */

/** Mirrors the ApiError used by the localStorage api.ts */
export class ApiError extends Error {
  constructor(
    public code: 400 | 401 | 403 | 404 | 409 | 500,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost/digital-leap-backend'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** Raw response envelope from the PHP API */
interface Envelope<T> {
  ok: boolean
  data?: T
  error?: string
}

/**
 * Makes an authenticated fetch call and returns the unwrapped `data` value.
 *
 * @throws ApiError   when the server returns ok=false or HTTP >= 400
 * @throws TypeError  on network failure
 */
export async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${BASE}${path}`

  const init: RequestInit = {
    method,
    credentials: 'include',   // send/receive the PHP session cookie
    headers: {
      'Content-Type': 'application/json',
    },
  }

  if (body !== undefined && method !== 'GET') {
    init.body = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetch(url, init)
  } catch (err) {
    throw new ApiError(500, 'Cannot reach the server. Check that XAMPP is running.')
  }

  let envelope: Envelope<T>
  try {
    envelope = (await response.json()) as Envelope<T>
  } catch {
    throw new ApiError(500, `Server returned an unexpected response (HTTP ${response.status}).`)
  }

  if (!envelope.ok || !response.ok) {
    const code = response.status as ApiError['code']
    const msg  = envelope.error ?? `HTTP ${response.status}`
    throw new ApiError(code, msg)
  }

  return envelope.data as T
}

// Convenience wrappers
export const get  = <T>(path: string)                    => request<T>('GET',    path)
export const post = <T>(path: string, body?: unknown)    => request<T>('POST',   path, body)
export const put  = <T>(path: string, body?: unknown)    => request<T>('PUT',    path, body)
export const patch = <T>(path: string, body?: unknown)   => request<T>('PATCH',  path, body)
export const del  = <T>(path: string)                    => request<T>('DELETE', path)
