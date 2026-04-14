"use client"

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useI18n } from '../i18n/context'
import LanguageToggle from '@/app/components/LanguageToggle'
import CategoryRow, { CategoryItem } from '@/app/components/CategoryRow'
import ListingCard, { Listing } from '@/app/components/ListingCard'
import useSWR from 'swr'

function HomeContent() {
  const { t } = useI18n()
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false)
  const [products, setProducts] = useState<Listing[]>([])
  const [isProductsLoading, setIsProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [notificationCount] = useState(3)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [coinBalance, setCoinBalance] = useState<number | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const API = useMemo(() => {
    const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
    if (!configuredBaseUrl) {
      console.error('NEXT_PUBLIC_API_BASE_URL is missing. Falling back to https://api.zivolf.com')
      return 'https://api.zivolf.com'
    }

    const normalized = configuredBaseUrl.replace(/\/$/, '')
    return normalized.replace(/\/api\/v1\/?$/, '')
  }, [])
  const categoryId = searchParams.get('category')

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (!storedToken) {
      router.push('/login')
    } else {
      fetchCategories(storedToken)
      fetchUserRole(storedToken)
    }
  }, [router])

  useEffect(() => {
    const baseUrl = API
    if (!baseUrl) {
      setProductsError('API url missing')
      return
    }

    if (!navigator.geolocation) {
      setProductsError('Geolocation not supported')
      return
    }

    setIsProductsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const categoryQuery = categoryId ? `&category=${categoryId}` : ''
          const requestUrl = `${baseUrl}/api/v1/listings?listing_type=product`;
          console.log('Nearest products URL:', requestUrl)
          const response = await fetch(requestUrl)
          if (response.ok) {
            const data: Listing[] = await response.json()
            setProducts(data)
          } else {
            setProductsError('Failed to fetch nearby products')
          }
        } catch (error) {
          console.error('Error fetching nearest products:', error)
          setProductsError('Unable to load nearby products')
        } finally {
          setIsProductsLoading(false)
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        setProductsError('Location permission denied')
        setIsProductsLoading(false)
      }
    )
  }, [API, categoryId])

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const baseUrl = API
  const { data: recommendedProducts = [] } = useSWR<Listing[]>(
    token && baseUrl ? [`${baseUrl}/api/v1/listings?listing_type=product`, token] : null,
    ([url, bearer]) =>
      fetch(url, { headers: { Authorization: `Bearer ${bearer}` } }).then((res) => res.json())
  )

  const { data: recentlyViewed = [] } = useSWR<Listing[]>(
    token && baseUrl ? [`${baseUrl}/api/v1/recommendations/recently-viewed`, token] : null,
    ([url, bearer]) =>
      fetch(url, { headers: { Authorization: `Bearer ${bearer}` } }).then((res) => res.json())
  )

const { data: trendingNearby = [] } = useSWR<Listing[]>(
  baseUrl ? `${baseUrl}/api/v1/listings?listing_type=product` : null,
  async (url: string): Promise<Listing[]> => {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    return res.json()
  }
)
  const fetchCategories = async (userToken: string) => {
    setIsCategoriesLoading(true)
    try {
      const baseUrl = API
      const requestUrl = `${baseUrl}/api/v1/categories`
      console.log('Categories URL:', requestUrl)
      const response = await fetch(requestUrl, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      })

      if (response.ok) {
        const data: CategoryItem[] = await response.json()
        const topLevel = data.filter((category) => !category.parent_id)
        setCategories(topLevel)
      } else if (response.status === 401) {
        localStorage.removeItem('token')
        router.push('/login')
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setIsCategoriesLoading(false)
    }
  }

  const fetchUserRole = async (userToken: string) => {
    const baseUrl = API
    if (!baseUrl) {
      return
    }

    try {
      const response = await fetch(`${baseUrl}/api/v1/users/me`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUserRole(data.role)
        const coinsResponse = await fetch(`${baseUrl}/api/v1/coins/balance`, {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        })
        if (coinsResponse.ok) {
          const coinsData = await coinsResponse.json()
          setCoinBalance(coinsData.balance ?? 0)
        }
      } else if (response.status === 401) {
        localStorage.removeItem('token')
        router.push('/login')
      }
    } catch (error) {
      console.error('Error fetching user role:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  const handleNavigate = (path: string) => {
    setIsProfileMenuOpen(false)
    router.push(path)
  }

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setProductsError('Voice search not supported')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.start()
    setIsListening(true)

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setSearchText(transcript)
      handleVoiceCommand(transcript)
      setIsListening(false)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }
  }

  const performSearch = async (query: string) => {
    const baseUrl = API
    if (!baseUrl) {
      setProductsError('API url missing')
      return
    }

    setIsProductsLoading(true)
    try {
      const requestUrl = `${baseUrl}/api/v1/search?q=${encodeURIComponent(query)}`
      console.log('Search URL:', requestUrl)
      const response = await fetch(requestUrl)
      if (response.ok) {
        const data: Listing[] = await response.json()
        setProducts(data)
      } else {
        setProductsError('Failed to fetch search results')
      }
    } catch (error) {
      console.error('Error searching products:', error)
      setProductsError('Unable to search products')
    } finally {
      setIsProductsLoading(false)
    }
  }

  const handleVoiceCommand = (query: string) => {
    const normalized = query.toLowerCase()
    if (normalized.includes('book') && normalized.includes('salon')) {
      router.push('/services?category=salon')
      return
    }
    if (normalized.includes('order') && normalized.includes('status')) {
      router.push('/my-orders')
      return
    }
    performSearch(query)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white font-semibold">
                <span>E</span>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">EcomEase</p>
                <p className="text-xs text-gray-500">Marketplace & Services</p>
              </div>
            </div>
            <div className="flex flex-1 items-center gap-3 md:max-w-xl">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                <input
                  type="text"
                  placeholder="Search products or services"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      performSearch(searchText)
                    }
                  }}
                  className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-12 text-sm text-gray-700 outline-none transition focus:border-purple-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleVoiceSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600"
                  aria-label="Voice search"
                >
                  {isListening ? '🎙️' : '🎤'}
                </button>
              </div>
              <button
                type="button"
                className="relative hidden md:inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-gray-600"
              >
                🔔
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {notificationCount}
                </span>
              </button>
              <button className="hidden md:inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700">
                🛒 Cart
              </button>
              {coinBalance !== null && (
                <div className="hidden md:flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
                  🪙 {coinBalance} coins
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <LanguageToggle />
              <div className="relative">
                <button
                  className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-purple-200"
                  type="button"
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                >
                  👤 Profile
                </button>
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white py-2 text-sm shadow-xl">
                    <button
                      type="button"
                      onClick={() => handleNavigate('/profile')}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-slate-50"
                    >
                      My Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavigate('/switch-role')}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-slate-50"
                    >
                      Switch Role
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavigate('/my-orders')}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-slate-50"
                    >
                      My Orders
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavigate('/rewards')}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-slate-50"
                    >
                      Rewards
                    </button>
                    {(userRole === 'seller' || userRole === 'both') && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleNavigate('/seller-dashboard')}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-slate-50"
                        >
                          My Store
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNavigate('/services')}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-slate-50"
                        >
                          My Services
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleNavigate('/community')}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-slate-50"
                    >
                      Community
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavigate('/settings')}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-slate-50"
                    >
                      Settings
                    </button>
                    <div className="my-2 h-px bg-slate-100" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 rounded-[28px] bg-linear-to-r from-purple-600 via-indigo-600 to-slate-900 px-6 py-8 text-white shadow-xl">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-purple-100">Welcome back</p>
            <h1 className="mt-2 text-3xl font-semibold">{t('common.welcome')}</h1>
            <p className="mt-3 text-sm text-purple-100/90">
              Find trending products, book reliable services, and manage everything in one place.
            </p>
          </div>
        </div>
        <CategoryRow categories={categories} isLoading={isCategoriesLoading} />

        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Nearby Products</h2>
          </div>

          {isProductsLoading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="mt-2 text-gray-600">Loading nearby products...</p>
            </div>
          ) : productsError ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              {productsError}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No nearby products found.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ListingCard key={product.id} listing={product} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recommended for you</h2>
          {recommendedProducts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              We are learning your preferences. Explore more to get recommendations.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {recommendedProducts.map((product) => (
                <ListingCard key={product.id} listing={product} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Trending near you</h2>
          {trendingNearby.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No trending local products yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {trendingNearby.map((product) => (
                <ListingCard key={product.id} listing={product} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recently viewed</h2>
          {recentlyViewed.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              You have not viewed any products yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {recentlyViewed.map((product) => (
                <ListingCard key={product.id} listing={product} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  )
}