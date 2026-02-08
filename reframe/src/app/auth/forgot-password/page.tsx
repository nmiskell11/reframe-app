'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const supabase = createClient()
    if (!supabase) return setError('Auth not configured')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
    setIsLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-4xl mb-4">{'\u2709\uFE0F'}</div>
            <h2 className="text-xl font-bold text-neutral-800 mb-2">Check your email</h2>
            <p className="text-sm text-neutral-600">
              We sent a password reset link to <strong>{email}</strong>.
              Click it to set a new password.
            </p>
            <Link
              href="/auth/login"
              className="inline-block mt-6 text-coral font-semibold text-sm hover:underline"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-coral">
            reFrame&trade;
          </Link>
          <p className="text-neutral-500 mt-2">Reset your password</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <p className="text-sm text-neutral-600">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-neutral-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border-2 border-neutral-200 px-4 py-3 text-sm focus:border-coral focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-coral text-white font-bold text-sm hover:bg-coral-dark transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <p className="text-center text-sm text-neutral-500">
            Remember your password?{' '}
            <Link href="/auth/login" className="text-coral font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
