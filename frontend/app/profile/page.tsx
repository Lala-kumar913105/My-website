'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  API_BASE_URL,
  buildLoginRedirectUrl,
  clearAuthClientData,
  getBestClientAccessToken,
  hasActiveSession,
  hasSessionHint,
} from '../../lib/auth'

type ProfilePayload = {
  name: string
  username: string
  email: string
  phone: string
  location: string
  bio: string
  profileImage: string
}

type CoinSnapshot = {
  balance: number
  streak_count: number
  badge_label?: string | null
}

type SellerProfile = {
  id: number
  user_id: number
  business_name: string
  approved?: boolean | null
}

const DEFAULT_AVATAR = '/default-avatar.png'
const MAX_IMAGE_SIZE = 2 * 1024 * 1024

const isJsonResponse = (response: Response) =>
  response.headers.get('content-type')?.includes('application/json')

const parseJsonResponse = async (response: Response) => {
  if (!isJsonResponse(response)) {
    const text = await response.text().catch(() => '')
    throw new Error(text || 'Invalid response format')
  }
  return response.json()
}

const getReadableUploadError = (rawDetail: string) => {
  const detail = (rawDetail || '').trim()
  if (!detail) return 'Unable to upload avatar. Please try again.'

  return detail
    .replace(/^Avatar upload failed:\s*/i, '')
    .replace(/^Upload failed:\s*/i, '')
}

const normalizeProfileData = (data: any): ProfilePayload => {
  const fullName =
    data?.name?.trim() ||
    [data?.first_name, data?.last_name].filter(Boolean).join(' ').trim() ||
    ''

  return {
    name: fullName,
    username: data?.username ?? '',
    email: data?.email ?? '',
    phone: data?.phone ?? data?.phone_number ?? '',
    location: data?.location ?? '',
    bio: data?.bio ?? '',
    profileImage: data?.profileImage ?? data?.profile_image ?? '',
  }
}

export default function ProfilePage() {
  const router = useRouter()

  const apiBaseUrl = useMemo(() => API_BASE_URL, [])

  const [profile, setProfile] = useState<ProfilePayload | null>(null)
  const [formData, setFormData] = useState<ProfilePayload>({
    name: '',
    username: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    profileImage: '',
  })
  const [avatarPreview, setAvatarPreview] = useState<string>(DEFAULT_AVATAR)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [coins, setCoins] = useState<CoinSnapshot | null>(null)
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null)
  const [sellerLoading, setSellerLoading] = useState(false)
  const [becomingSeller, setBecomingSeller] = useState(false)
  const [isAuthChecking, setIsAuthChecking] = useState(true)

  const handleSessionExpired = useCallback(
    (message = 'Session expired. Please login again.') => {
      clearAuthClientData()
      setCoins(null)
      setProfile(null)
      setError(message)
      toast.error(message)
      router.push(buildLoginRedirectUrl('/profile'))
    },
    [router]
  )

  const getStoredAuth = useCallback(() => {
    const token = getBestClientAccessToken() || ''

    if (process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true') {
      console.log('[profile] token_check', { hasToken: Boolean(token) })
    }

    return { token }
  }, [])

  const fetchSellerProfile = useCallback(async (token?: string) => {
    setSellerLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/sellers/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setSellerProfile(data)
        return
      }

      if (response.status === 404) {
        setSellerProfile(null)
        return
      }

      if (response.status === 401) {
        handleSessionExpired('Session expired. Please login again.')
        return
      }

      setSellerProfile(null)
    } catch {
      setSellerProfile(null)
    } finally {
      setSellerLoading(false)
    }
  }, [apiBaseUrl, handleSessionExpired])

  const handleBecomeSeller = useCallback(async () => {
    const token = getStoredAuth().token

    try {
      setBecomingSeller(true)
      const response = await fetch(`${apiBaseUrl}/api/v1/sellers/become-seller`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      })

      if (response.status === 401) {
        handleSessionExpired('Session expired. Please login again.')
        return
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(errorText || 'Failed to become seller')
      }

      const sellerData = await response.json()
      setSellerProfile(sellerData)
      toast.success('You are now a seller')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to become seller')
    } finally {
      setBecomingSeller(false)
    }
  }, [apiBaseUrl, getStoredAuth, handleSessionExpired])

  const buildAuthHeaders = useCallback((): HeadersInit => {
    const { token } = getStoredAuth()
    const headers: HeadersInit = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return headers
  }, [getStoredAuth])

  useEffect(() => {
    let isMounted = true

    const fetchProfile = async () => {
      setIsAuthChecking(true)
      if (!hasSessionHint()) {
        if (isMounted) {
          setProfile(null)
          setError(null)
          router.replace(buildLoginRedirectUrl('/profile'))
          setIsAuthChecking(false)
        }
        return
      }

      const activeSession = await hasActiveSession()
      if (process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true') {
        console.log('[profile] active_session', { activeSession })
      }
      if (!activeSession) {
        if (isMounted) {
          setProfile(null)
          setError(null)
          router.replace(buildLoginRedirectUrl('/profile'))
          setIsAuthChecking(false)
        }
        return
      }

      const headers = buildAuthHeaders()

      try {
        setError(null)

        const res = await fetch(`${apiBaseUrl}/api/v1/users/me`, {
          headers,
          credentials: 'include',
          cache: 'no-store',
        })

        if (process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true') {
          console.log('[profile] /users/me status', { status: res.status })
        }
        if (res.status === 401) {
          handleSessionExpired('Session expired. Please login again.')
          return
        }

        if (!res.ok) {
          let detail = 'Profile not available'
          try {
            if (isJsonResponse(res)) {
              const body = await res.json()
              detail = body?.detail || body?.message || detail
            } else {
              const text = await res.text()
              detail = text || detail
            }
          } catch {
            // fallback detail hi rahega
          }
          throw new Error(detail)
        }

        const data = await parseJsonResponse(res)

        if (!isMounted) return

        const payload = normalizeProfileData(data)

        setProfile(payload)
        setFormData(payload)
        setAvatarPreview(payload.profileImage || DEFAULT_AVATAR)

        const latestToken = getStoredAuth().token

        if (latestToken) {
          try {
            const coinRes = await fetch(`${apiBaseUrl}/api/v1/coins/balance`, {
              headers: {
                Authorization: `Bearer ${latestToken}`,
              },
              credentials: 'include',
            })

            if (!isMounted) return

            if (coinRes.status === 401) {
              handleSessionExpired('Session expired. Please login again.')
              return
            }

            if (!coinRes.ok) {
              if (coinRes.status === 404) {
                setCoins(null)
              }
              return
            }

            if (!isJsonResponse(coinRes)) {
              setCoins(null)
              return
            }

            const coinData = await coinRes.json()

            if (!isMounted) return

            setCoins({
              balance: coinData?.balance ?? 0,
              streak_count: coinData?.streak_count ?? 0,
              badge_label: coinData?.badge_label ?? null,
            })
          } catch {
            if (isMounted) {
              setCoins(null)
            }
          }

          if (isMounted) {
            await fetchSellerProfile(latestToken)
          }
        }
      } catch (err: any) {
        if (!isMounted) return
        setError(err?.message || 'Profile not available')
      } finally {
        if (isMounted) {
          setIsAuthChecking(false)
        }
      }
    }

    fetchProfile()

    return () => {
      isMounted = false
    }
  }, [apiBaseUrl, buildAuthHeaders, fetchSellerProfile, getStoredAuth, handleSessionExpired])

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed')
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Image must be under 2MB')
      return
    }

    const previousPreview = avatarPreview
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)

    const headers = buildAuthHeaders()

    const form = new FormData()
    form.append('file', file)

    try {
      setIsUploading(true)

      const response = await fetch(`${apiBaseUrl}/api/v1/profile/avatar`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: form,
      })

      if (response.status === 401) {
        setAvatarPreview(previousPreview || DEFAULT_AVATAR)
        handleSessionExpired('Session expired. Please login again.')
        return
      }

      if (!response.ok) {
        const detail = isJsonResponse(response)
          ? (await response.json())?.detail || 'Upload failed'
          : (await response.text()) || 'Upload failed'
        throw new Error(detail)
      }

      const data = await response.json()
      const secureUrl = data?.secure_url || data?.url

      if (!secureUrl) {
        throw new Error('Image URL not returned')
      }

      setFormData((prev) => ({
        ...prev,
        profileImage: secureUrl,
      }))
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              profileImage: secureUrl,
            }
          : prev
      )
      setAvatarPreview(secureUrl)
      toast.success('Avatar updated successfully')
    } catch (error: any) {
      setAvatarPreview(previousPreview || DEFAULT_AVATAR)
      toast.error(getReadableUploadError(error?.message || ''))
    } finally {
      setIsUploading(false)
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and email are required')
      return
    }

    const headers = buildAuthHeaders()

    try {
      setIsSaving(true)

      const response = await fetch(`${apiBaseUrl}/api/v1/profile/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone_number: formData.phone,
          username: formData.username,
          bio: formData.bio,
          location: formData.location,
          profile_image: formData.profileImage,
        }),
      })

      if (response.status === 401) {
        handleSessionExpired('Session expired. Please login again.')
        return
      }

      if (!response.ok) {
        let detail = 'Update failed'

        try {
          if (isJsonResponse(response)) {
            const errorBody = await response.json()
            detail = errorBody?.detail || errorBody?.message || detail
          } else {
            const text = await response.text()
            detail = text || detail
          }
        } catch {
          // fallback detail
        }

        toast.error(detail)
        return
      }

      const updatedUser = await parseJsonResponse(response)
      const updatedPayload = normalizeProfileData(updatedUser)

      setProfile(updatedPayload)
      setFormData(updatedPayload)
      setAvatarPreview(updatedPayload.profileImage || DEFAULT_AVATAR)
      setError(null)

      toast.success('Profile updated')
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error('Update failed')
    } finally {
      setIsSaving(false)
    }
  }

  const profileCompletion = [
    formData.name,
    formData.username,
    formData.email,
    formData.phone,
    formData.location,
    formData.bio,
  ].filter((value) => value?.trim()).length

  const completionPercent = Math.round((profileCompletion / 6) * 100)

  if (error) {
    return (
      <div className="app-shell">
        <div className="app-container">
          <section className="ds-card text-center">
            <h1 className="text-xl font-semibold text-slate-900">Unable to load profile</h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <button type="button" onClick={() => router.refresh()} className="ds-btn-primary mt-4">
              Retry
            </button>
          </section>
        </div>
      </div>
    )
  }

  if (isAuthChecking || !profile) {
    return (
      <div className="app-shell">
        <div className="app-container space-y-4">
          <div className="ds-card h-40 animate-pulse bg-slate-100" />
          <div className="ds-card h-80 animate-pulse bg-slate-100" />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="app-container space-y-4">
        <section className="ds-hero-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={avatarPreview || DEFAULT_AVATAR}
                  alt="Profile"
                  className="h-20 w-20 rounded-full border border-slate-200 object-cover shadow-sm"
                />
                <label
                  htmlFor="profileImage"
                  className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-slate-900 text-xs text-white shadow"
                >
                  ✎
                </label>
                <input
                  id="profileImage"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploading}
                  onChange={handleImageChange}
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Account Center</p>
                <h1 className="mt-1 text-2xl font-semibold text-slate-900">{formData.name || 'Your Profile'}</h1>
                <p className="text-sm text-slate-600">@{formData.username || 'username'} • {formData.email}</p>
                {formData.bio && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{formData.bio}</p>}
                {isUploading && <p className="mt-1 text-xs text-slate-500">Uploading image...</p>}
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push('/seller-dashboard')}
              className="ds-btn-secondary"
            >
              Open Dashboard
            </button>
          </div>
        </section>

        <section className="ds-card">
          <h2 className="ds-title">Profile Stats</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Completion</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{completionPercent}%</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Coins</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{coins?.balance ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Streak</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{coins?.streak_count ?? 0} days</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Badge</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{coins?.badge_label ?? 'Bronze'}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <form onSubmit={handleSubmit} className="ds-card space-y-5">
            <div>
              <h2 className="ds-title">Edit Profile</h2>
              <p className="ds-subtitle">Keep your details updated for orders, bookings, and store activity.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="ds-label">Name</label>
                <input name="name" value={formData.name} onChange={handleChange} placeholder="Your name" className="ds-input" />
              </div>
              <div>
                <label className="ds-label">Username</label>
                <input name="username" value={formData.username} onChange={handleChange} placeholder="@username" className="ds-input" />
              </div>
              <div>
                <label className="ds-label">Email</label>
                <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email address" className="ds-input" />
              </div>
              <div>
                <label className="ds-label">Phone</label>
                <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone number" className="ds-input" />
              </div>
            </div>

            <div>
              <label className="ds-label">Location</label>
              <input name="location" value={formData.location} onChange={handleChange} placeholder="City, Country" className="ds-input" />
            </div>

            <div>
              <label className="ds-label">Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                placeholder="Tell us about yourself"
                className="ds-input min-h-28 resize-y"
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">Changes are reflected across your profile and purchase history.</p>
              <button type="submit" disabled={isSaving || isUploading} className="ds-btn-primary disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>

          <aside className="space-y-4">
            <section className="ds-card">
              <h2 className="ds-title">Seller Status</h2>
              <p className="mt-2 text-sm text-slate-600">
                {sellerLoading
                  ? 'Checking seller status...'
                  : sellerProfile
                    ? 'Your seller account is active.'
                    : 'Upgrade your account to start selling.'}
              </p>

              {sellerProfile && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{sellerProfile.business_name}</p>
                  <p className="mt-1 text-xs">
                    Status: {sellerProfile.approved ? 'Approved Seller' : 'Pending approval'}
                  </p>
                </div>
              )}

              <div className="mt-4">
                {!sellerProfile ? (
                  <button
                    type="button"
                    onClick={handleBecomeSeller}
                    disabled={becomingSeller || sellerLoading}
                    className="ds-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {becomingSeller ? 'Becoming Seller...' : 'Become Seller'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push('/seller-dashboard')}
                    className="ds-btn-secondary w-full"
                  >
                    Go to Seller Dashboard
                  </button>
                )}
              </div>
            </section>

            <section className="ds-card">
              <h2 className="ds-title">Quick Actions</h2>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <button type="button" onClick={() => router.push('/my-orders')} className="ds-btn-secondary w-full">
                  View Orders
                </button>
                <button type="button" onClick={() => router.push('/my-bookings')} className="ds-btn-secondary w-full">
                  View Bookings
                </button>
                <button type="button" onClick={() => router.push('/wishlist')} className="ds-btn-secondary w-full">
                  Open Wishlist
                </button>
                <button type="button" onClick={() => router.push('/search')} className="ds-btn-primary w-full">
                  Explore Marketplace
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}