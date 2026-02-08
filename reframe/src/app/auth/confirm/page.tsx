'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function ConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    if (!token_hash || !type) {
      setStatus('success')
      return
    }

    const supabase = createClient()
    if (!supabase) {
      setStatus('error')
      setErrorMessage('Auth not configured')
      return
    }

    supabase.auth
      .verifyOtp({ token_hash, type: type as 'email' })
      .then(({ error }) => {
        if (error) {
          setStatus('error')
          setErrorMessage(error.message)
        } else {
          setStatus('success')
          setTimeout(() => {
            router.push('/reframe')
          }, 3000)
        }
      })
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {status === 'verifying' && (
            <>
              <div className="text-4xl mb-4 animate-pulse">{'\u2728'}</div>
              <h2 className="text-xl font-bold text-neutral-800 mb-2">Verifying your email...</h2>
              <p className="text-sm text-neutral-600">Just a moment.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-4xl mb-4">{'\u2705'}</div>
              <h2 className="text-xl font-bold text-neutral-800 mb-2">Email verified!</h2>
              <p className="text-sm text-neutral-600 mb-4">
                Your account is active. Redirecting you to reFrame...
              </p>
              <Link
                href="/reframe"
                className="inline-block text-coral font-semibold text-sm hover:underline"
              >
                Go to reFrame now
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-4xl mb-4">{'\u274C'}</div>
              <h2 className="text-xl font-bold text-neutral-800 mb-2">Verification failed</h2>
              <p className="text-sm text-neutral-600 mb-4">
                {errorMessage || 'The verification link may have expired. Please try signing up again.'}
              </p>
              <Link
                href="/auth/signup"
                className="inline-block text-coral font-semibold text-sm hover:underline"
              >
                Back to Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream flex items-center justify-center">
          <p className="text-neutral-500 animate-pulse">Verifying...</p>
        </div>
      }
    >
      <ConfirmContent />
    </Suspense>
  )
}
