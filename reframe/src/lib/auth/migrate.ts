import { getSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * Migrate anonymous session data to an authenticated user.
 * Called after first login when a session token exists in localStorage.
 * Associates all prior reframe_sessions with the new user_id.
 */
export async function migrateAnonymousToUser(
  sessionToken: string,
  userId: string
): Promise<{ migrated: number }> {
  const { data, error } = await getSupabaseAdmin()
    .from('reframe_sessions')
    .update({ user_id: userId })
    .eq('session_token', sessionToken)
    .is('user_id', null)
    .select('id')

  if (error) {
    console.error('Migration error:', error)
    return { migrated: 0 }
  }

  return { migrated: data?.length ?? 0 }
}
