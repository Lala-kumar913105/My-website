import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const FALLBACK_API = 'https://api.zivolf.com'

const normalizeBaseUrl = (rawUrl: string) => {
  const trimmed = rawUrl.trim().replace(/\/$/, '')
  return trimmed.replace(/\/api\/v1\/?$/, '')
}

export async function POST(request: Request) {
  let payload: Record<string, unknown> | null = null
  const requestId = crypto.randomUUID()

  try {
    payload = await request.json()
  } catch (error) {
    console.error('[verify-otp] Invalid JSON payload', { requestId, error })
    return NextResponse.json({ detail: 'Invalid payload' }, { status: 400 })
  }

  const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  if (!rawBaseUrl) {
    console.error('[verify-otp] NEXT_PUBLIC_API_BASE_URL is missing. Falling back to https://api.zivolf.com')
  }
  const resolvedBaseUrl = rawBaseUrl || FALLBACK_API
  const baseUrl = normalizeBaseUrl(resolvedBaseUrl)

  const phoneNumber =
    (payload?.phone_number as string | undefined) ||
    (payload?.phoneNumber as string | undefined)
  const otp = (payload?.otp as string | undefined) || (payload?.code as string | undefined)

  if (!phoneNumber || !otp) {
    console.error('[verify-otp] Missing required fields', { requestId, payload })
    return NextResponse.json(
      { detail: 'phone_number and otp are required' },
      { status: 400 }
    )
  }

  const outboundPayload = { phone_number: phoneNumber, otp }

  try {
    console.info('[verify-otp] Forwarding OTP verification', {
      requestId,
      baseUrl,
      endpoint: `${baseUrl}/api/v1/auth/verify-otp`,
      phoneNumber,
    })

    const response = await fetch(`${baseUrl}/api/v1/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(outboundPayload),
    })

    const data = await response.text()
    console.info('[verify-otp] Backend response status', {
      requestId,
      status: response.status,
    })

    if (!response.ok) {
      console.error('[verify-otp] Backend response body', {
        requestId,
        status: response.status,
        body: data,
      })
      let detail = data
      try {
        const parsed = JSON.parse(data)
        detail = parsed?.detail || parsed?.message || data
      } catch {}
      return NextResponse.json(
        {
          detail,
          backend_status: response.status,
          request_id: requestId,
        },
        { status: response.status }
      )
    }

    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'application/json',
      },
    })
  } catch (error) {
    console.error('[verify-otp] Backend unavailable', { requestId, error })
    return NextResponse.json(
      {
        detail: 'Backend unavailable',
        error: (error as Error)?.message,
        request_id: requestId,
      },
      { status: 503 }
    )
  }
}