'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/app/i18n/context'
import LanguageToggle from '@/app/components/LanguageToggle'

export default function LoginPage() {
  const { t } = useI18n()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const router = useRouter()
  const API = process.env.NEXT_PUBLIC_API_URL

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`${API}/api/v1/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone_number: phoneNumber }),
      })

      if (response.ok) {
        const data = await response.json()
        setShowOtpInput(true)
      } else {
        alert('Failed to send OTP')
      }
    } catch (error) {
      alert('Error sending OTP')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`${API}/api/v1/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          otp: otp,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const token = data.token || data.access_token
        if (!token) {
          alert('Login succeeded but no token was returned')
          return
        }
        localStorage.setItem('token', token)
        localStorage.setItem('phone_number', phoneNumber)
        localStorage.setItem('otp', otp)
        router.push('/')
      } else {
        alert('Invalid or expired OTP')
      }
    } catch (error) {
      alert('Error verifying OTP')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <LanguageToggle />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('common.welcome')}</h1>
          <p className="text-gray-600">{t('login.title')}</p>
        </div>

        {!showOtpInput ? (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                {t('login.phone')}
              </label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                placeholder="+91 98765 43210"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                OTP
              </label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                placeholder={t('login.phone')}
                maxLength={6}
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                OTP sent to <span className="font-semibold">{phoneNumber}</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying OTP...' : 'Verify OTP'}
            </button>

            <button
              type="button"
              onClick={() => setShowOtpInput(false)}
              className="w-full py-3 text-gray-600 font-semibold rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all"
            >
              {t('login.phone')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}