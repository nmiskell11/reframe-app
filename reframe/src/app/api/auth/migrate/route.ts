import { NextRequest, NextResponse } from 'next/server'
import { migrateAnonymousToUser } from '@/lib/auth/migrate'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * POST /api/auth/migrate
 * Called by the frontend after first login when a session_token exists.
 * Associates anonymous reframe_sessions with the authenticated user.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: { sessionToken?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.sessionToken || typeof body.sessionToken !== 'string') {
    return NextResponse.json({ error: 'sessionToken required' }, { status: 400 })
  }

  const result = await migrateAnonymousToUser(body.sessionToken, user.id)
  return NextResponse.json(result)
}
