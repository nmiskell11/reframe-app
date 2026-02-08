'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'

export function Header() {
  const { user, isAuthenticated, isLoading, signOut } = useAuth()

  return (
    <nav className="bg-coral px-5 py-4 flex justify-between items-center shadow-md sticky top-0 z-50 md:px-10">
      <Link href="/" className="text-2xl font-bold text-white tracking-tight">
        reFrame&trade;
      </Link>

      <div className="flex items-center gap-4 md:gap-6">
        <Link
          href="/reframe"
          className="text-white text-sm hover:opacity-80 transition-opacity"
        >
          Try It
        </Link>

        {isLoading ? (
          <div className="w-20 h-9 bg-white/20 rounded-lg animate-pulse" />
        ) : isAuthenticated ? (
          <div className="flex items-center gap-3">
            <span className="text-white/80 text-sm hidden sm:inline">
              {user?.email}
            </span>
            <button
              onClick={signOut}
              className="bg-white text-coral px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-lg transition-shadow"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link
            href="/auth/login"
            className="bg-white text-coral px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-lg transition-shadow"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  )
}
