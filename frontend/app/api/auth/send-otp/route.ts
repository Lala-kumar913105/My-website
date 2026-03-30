import { NextResponse } from 'next/server'

const FALLBACK_API = 'http://13.235.104.120'

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
    console.error('[send-otp] Invalid JSON payload', { requestId, error })
    return NextResponse.json({ detail: 'Invalid payload' }, { status: 400 })
  }

  const rawBaseUrl = process.env.API_URL || FALLBACK_API
  const baseUrl = normalizeBaseUrl(rawBaseUrl)

  const phoneNumber =
    (payload?.phone_number as string | undefined) ||
    (payload?.phoneNumber as string | undefined)

  if (!phoneNumber) {
    console.error('[send-otp] Missing phone_number in payload', {
      requestId,
      payload,
    })
    return NextResponse.json({ detail: 'phone_number is required' }, { status: 400 })
  }

  const outboundPayload = { phone_number: phoneNumber }

  try {
    console.info('[send-otp] Forwarding OTP request', {
      requestId,
      baseUrl,
      endpoint: `${baseUrl}/api/v1/auth/send-otp`,
      phoneNumber,
    })

    const response = await fetch(`${baseUrl}/api/v1/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(outboundPayload),
    })

    const data = await response.text()
    console.info('[send-otp] Backend response status', {
      requestId,
      status: response.status,
    })

    if (!response.ok) {
      console.error('[send-otp] Backend response body', {
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
    console.error('[send-otp] Backend unavailable', { requestId, error })
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