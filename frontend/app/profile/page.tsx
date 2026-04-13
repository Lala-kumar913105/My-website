'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

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

  const apiBaseUrl = useMemo(() => {
    const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
    if (!rawBase) {
      console.error(
        'NEXT_PUBLIC_API_BASE_URL is missing. Falling back to https://api.zivolf.com'
      )
      return 'https://api.zivolf.com'
    }

    const normalized = rawBase.replace(/\/$/, '')
    return normalized.replace(/\/api\/v1\/?$/, '')
  }, [])

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
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [coins, setCoins] = useState<CoinSnapshot | null>(null)

  const themeClasses = useMemo(
    () =>
      isDarkMode
        ? 'bg-slate-950 text-slate-100'
        : 'bg-slate-50 text-slate-900',
    [isDarkMode]
  )

  const handleSessionExpired = useCallback(
    (message = 'Session expired. Please login again.') => {
      localStorage.removeItem('token')
      localStorage.removeItem('phone_number')
      localStorage.removeItem('otp')
      setCoins(null)
      setProfile(null)
      setError(message)
      toast.error(message)
      router.push('/login')
    },
    [router]
  )

  const getStoredAuth = useCallback(() => {
    const rawToken = localStorage.getItem('token')
    const token = rawToken?.replace(/^Bearer\s+/i, '').trim() || ''
    const phoneNumber = localStorage.getItem('phone_number')?.trim() || ''
    const otp = localStorage.getItem('otp')?.trim() || ''

    return { token, phoneNumber, otp }
  }, [])

  const buildAuthHeaders = useCallback((): HeadersInit | null => {
    const { token, phoneNumber, otp } = getStoredAuth()

    if (!token && !phoneNumber) {
      return null
    }

    const headers: HeadersInit = {}

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    if (phoneNumber) {
      headers['x-phone-number'] = phoneNumber
    }

    if (otp) {
      headers['x-otp'] = otp
    }

    return headers
  }, [getStoredAuth])

  useEffect(() => {
    let isMounted = true

    const fetchProfile = async () => {
      const headers = buildAuthHeaders()

      if (!headers) {
        handleSessionExpired('Please login to continue.')
        return
      }

      try {
        setError(null)

        const res = await fetch('/api/profile', {
          headers,
          cache: 'no-store',
        })

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

        if (data?.accessToken) {
          localStorage.setItem('token', data.accessToken)
        }

        const payload = normalizeProfileData(data)

        setProfile(payload)
        setFormData(payload)
        setAvatarPreview(payload.profileImage || DEFAULT_AVATAR)

        const latestToken =
          data?.accessToken ||
          getStoredAuth().token

        if (latestToken) {
          try {
            const coinRes = await fetch(`${apiBaseUrl}/api/v1/coins/balance`, {
              headers: {
                Authorization: `Bearer ${latestToken}`,
              },
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
        }
      } catch (err: any) {
        if (!isMounted) return
        setError(err?.message || 'Profile not available')
      }
    }

    fetchProfile()

    return () => {
      isMounted = false
    }
  }, [apiBaseUrl, buildAuthHeaders, getStoredAuth, handleSessionExpired])

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

    const uploadUrl = process.env.NEXT_PUBLIC_CLOUDINARY_URL
    const uploadPreset = process.env.NEXT_PUBLIC_UPLOAD_PRESET

    if (!uploadUrl || !uploadPreset) {
      toast.error('Cloudinary configuration missing')
      return
    }

    const previousPreview = avatarPreview
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)

    const form = new FormData()
    form.append('file', file)
    form.append('upload_preset', uploadPreset)

    try {
      setIsUploading(true)

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: form,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      const secureUrl = data?.secure_url

      if (!secureUrl) {
        throw new Error('Image URL not returned')
      }

      setFormData((prev) => ({
        ...prev,
        profileImage: secureUrl,
      }))
      setAvatarPreview(secureUrl)
      toast.success('Image uploaded')
    } catch (error) {
      setAvatarPreview(previousPreview || DEFAULT_AVATAR)
      toast.error('Upload failed')
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

    if (!headers) {
      handleSessionExpired('Session expired. Please login again.')
      return
    }

    try {
      setIsSaving(true)

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
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

      if (updatedUser?.accessToken) {
        localStorage.setItem('token', updatedUser.accessToken)
      }

      toast.success('Profile updated')
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error('Update failed')
    } finally {
      setIsSaving(false)
    }
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${themeClasses}`}>
        <div className="rounded-2xl bg-white/90 p-8 shadow-xl text-slate-900">
          {error}
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${themeClasses}`}>
        Loading...
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${themeClasses} flex items-center justify-center px-4 py-12`}>
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur sm:p-10 dark:border-slate-800/60 dark:bg-slate-900/80">
        <div className="flex flex-col gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          <div>
            <h1 className="text-2xl font-semibold">Edit Profile</h1>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Keep your profile fresh and Instagram-ready.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsDarkMode((prev) => !prev)}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500"
          >
            {isDarkMode ? 'Light mode' : 'Dark mode'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {coins && (
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-700">
              <div className="flex flex-wrap gap-4">
                <div>
                  <p className="text-xs uppercase">Coin Balance</p>
                  <p className="text-lg font-semibold">{coins.balance}</p>
                </div>
                <div>
                  <p className="text-xs uppercase">Streak</p>
                  <p className="text-lg font-semibold">{coins.streak_count} days</p>
                </div>
                <div>
                  <p className="text-xs uppercase">Badge</p>
                  <p className="text-lg font-semibold">{coins.badge_label ?? 'Bronze'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div className="relative">
              <img
                src={avatarPreview || DEFAULT_AVATAR}
                alt="Profile"
                className="h-24 w-24 rounded-full object-cover shadow"
              />

              <label
                htmlFor="profileImage"
                className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-900 text-white shadow-lg"
              >
                ✎
              </label>

              <input
                id="profileImage"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            <div>
              <h2 className="text-lg font-semibold">{formData.name}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">{formData.email}</p>
              {isUploading && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
                  Uploading image...
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Username</label>
              <input
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="@username"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email address"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Phone</label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone number"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Location</label>
              <input
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="City, Country"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              placeholder="Tell us about yourself"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-300">
              Changes will be visible across your profile and orders.
            </p>

            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}