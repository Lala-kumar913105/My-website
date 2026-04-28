import { NextResponse } from 'next/server'

const FALLBACK_API = 'https://api.zivolf.com'
const REQUEST_TIMEOUT_MS = 5000

const normalizeBaseUrl = (rawUrl: string) => {
  const trimmed = rawUrl.trim().replace(/\/$/, '')
  return trimmed.replace(/\/api\/v1\/?$/, '')
}

const isJsonResponse = (response: Response) =>
  response.headers.get('content-type')?.includes('application/json')

const parseJsonResponse = async (response: Response) => {
  if (!isJsonResponse(response)) {
    const text = await response.text().catch(() => '')
    throw new Error(text || 'Invalid response format')
  }
  return response.json()
}

const resolveApiBaseUrl = (scope: 'profile:get' | 'profile:put') => {
  const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  if (!rawBaseUrl) {
    console.error(`[${scope}] NEXT_PUBLIC_API_BASE_URL is missing. Falling back to https://api.zivolf.com`)
  }
  return normalizeBaseUrl(rawBaseUrl || FALLBACK_API)
}

const fetchAccessToken = async (baseUrl: string, phoneNumber: string, otp: string) => {
  const response = await fetch(`${baseUrl}/api/v1/auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone_number: phoneNumber,
      otp,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    return null
  }

  try {
    const data = await parseJsonResponse(response)
    return data?.token || data?.access_token || null
  } catch {
    return null
  }
}

const resolveRequestToken = async (
  request: Request,
  scope: 'profile:get' | 'profile:put'
) => {
  const authHeader = request.headers.get('authorization')?.trim() || ''
  const headerToken = authHeader.replace(/^Bearer\s+/i, '').trim()
  const explicitToken = request.headers.get('x-access-token')?.trim()
  let token = headerToken || explicitToken || ''

  const phoneNumber = request.headers.get('x-phone-number')?.trim()
  const otp = request.headers.get('x-otp')?.trim()

  const baseUrl = resolveApiBaseUrl(scope)

  if (!token && phoneNumber && otp) {
    const freshToken = await fetchAccessToken(baseUrl, phoneNumber, otp)
    if (freshToken) {
      token = freshToken
    }
  }

  return {
    token,
    baseUrl,
    forwardedAuthHeader: authHeader || (token ? `Bearer ${token}` : ''),
  }
}

export async function GET(request: Request) {
  const { token, baseUrl, forwardedAuthHeader } = await resolveRequestToken(
    request,
    'profile:get'
  )

  if (!token) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    const response = await fetch(`${baseUrl}/api/v1/users/me`, {
      headers: {
        Authorization: forwardedAuthHeader,
      },
      cache: 'no-store',
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (response.status === 401) {
      return NextResponse.json({ detail: 'Token expired' }, { status: 401 })
    }

    if (!response.ok) {
      const status = response.status
      let detail = 'Request failed'

      try {
        if (isJsonResponse(response)) {
          const errorBody = await response.json()
          detail = errorBody?.detail || errorBody?.message || detail
        } else {
          detail = (await response.text()) || detail
        }
      } catch {}

      if (status === 401) detail = 'Unauthorized'
      if (status === 403) detail = 'Forbidden'

      return NextResponse.json({ detail }, { status })
    }

    const data = await parseJsonResponse(response)
    const name = `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim()

    return NextResponse.json({
      id: data.id,
      name: name || data.email || data.phone_number || 'User',
      email: data.email ?? null,
      phone: data.phone_number ?? null,
      username: data.username ?? null,
      bio: data.bio ?? null,
      location: data.location ?? null,
      profileImage: data.profile_image ?? null,
      role: data.role,
      accessToken: token,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { detail: 'Backend request timed out' },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { detail: 'Backend unavailable. Please try again shortly.' },
      { status: 503 }
    )
  }
}

export async function PUT(request: Request) {
  const { token, baseUrl, forwardedAuthHeader } = await resolveRequestToken(
    request,
    'profile:put'
  )

  if (!token) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => null)

  if (!body) {
    return NextResponse.json({ detail: 'Invalid payload' }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    const response = await fetch(`${baseUrl}/api/v1/profile/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: forwardedAuthHeader,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const payload = await parseJsonResponse(response).catch(() => null)

    if (response.status === 401) {
      return NextResponse.json({ detail: 'Token expired' }, { status: 401 })
    }

    if (!response.ok) {
      const detail = payload?.detail || payload?.message || 'Request failed'
      return NextResponse.json({ detail }, { status: response.status })
    }

    return NextResponse.json(payload ?? {})
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { detail: 'Backend request timed out' },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { detail: 'Backend unavailable. Please try again shortly.' },
      { status: 503 }
    )
  }
}

export async function POST(request: Request) {
  const { token, baseUrl, forwardedAuthHeader } = await resolveRequestToken(
    request,
    'profile:put'
  )

  if (!token) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ detail: 'Invalid file payload' }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS * 4)

    const upstreamFormData = new FormData()
    upstreamFormData.append('file', file)

    const response = await fetch(`${baseUrl}/api/v1/profile/avatar`, {
      method: 'POST',
      headers: {
        Authorization: forwardedAuthHeader,
      },
      body: upstreamFormData,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const payload = await parseJsonResponse(response).catch(() => null)

    if (response.status === 401) {
      return NextResponse.json({ detail: 'Token expired' }, { status: 401 })
    }

    if (!response.ok) {
      const detail = payload?.detail || payload?.message || 'Upload failed'
      return NextResponse.json({ detail }, { status: response.status })
    }

    return NextResponse.json(payload ?? {})
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { detail: 'Backend request timed out' },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { detail: 'Backend unavailable. Please try again shortly.' },
      { status: 503 }
    )
  }
}