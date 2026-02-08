'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  sessionToken: string
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function getOrCreateSessionToken(): string {
  if (typeof window === 'undefined') return 'server_render'
  const existing = localStorage.getItem('reframe_session_token')
  if (existing) return existing
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  const random = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  const token = `anon_${Date.now()}_${random}`
  localStorage.setItem('reframe_session_token', token)
  return token
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionToken] = useState(getOrCreateSessionToken)
  const migrationAttempted = useRef(false)

  const supabase = useMemo(() => createClient(), [])

  // Migrate anonymous sessions to authenticated user on first sign-in
  const migrateAnonymousSessions = useCallback(async () => {
    if (migrationAttempted.current) return
    migrationAttempted.current = true

    const token = localStorage.getItem('reframe_session_token')
    if (!token) return

    try {
      await fetch('/api/auth/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: token }),
      })
    } catch {
      // Non-blocking — migration failure shouldn't break the app
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, s: Session | null) => {
      setSession(s)
      setUser(s?.user ?? null)

      // Trigger anonymous-to-authenticated migration on first login
      if (event === 'SIGNED_IN' && s?.user) {
        migrateAnonymousSessions()
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, migrateAnonymousSessions])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    router.push('/')
    router.refresh()
  }, [supabase, router])

  const value = useMemo(
    () => ({
      user,
      session,
      isLoading,
      isAuthenticated: !!user,
      sessionToken,
      signOut,
    }),
    [user, session, isLoading, sessionToken, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
