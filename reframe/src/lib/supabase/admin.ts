import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS. Server-only.
// Lazy-initialized to avoid build-time errors when env vars aren't set.
let _client: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _client
}
