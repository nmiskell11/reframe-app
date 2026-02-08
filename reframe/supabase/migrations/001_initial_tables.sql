-- Migration: Create initial reFrame tables
-- Run via Supabase dashboard or supabase db push

-- ============================================
-- reframe_sessions: one row per tool invocation
-- ============================================
create table if not exists public.reframe_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- User identity (one or both may be set)
  user_id uuid references auth.users(id) on delete set null,
  session_token text,  -- anonymous user tracking

  -- Input metadata (never store raw messages)
  relationship_type text not null default 'general',
  had_context boolean not null default false,
  context_length integer not null default 0,
  message_length integer not null default 0,

  -- RFD detection outcomes
  rfd_inbound_triggered boolean not null default false,
  rfd_inbound_patterns text[],
  rfd_inbound_severity text,

  rfd_outbound_triggered boolean not null default false,
  rfd_outbound_patterns text[],
  rfd_outbound_severity text
);

-- Index for anonymous session migration
create index if not exists idx_sessions_token on public.reframe_sessions(session_token)
  where session_token is not null;

-- Index for user history
create index if not exists idx_sessions_user on public.reframe_sessions(user_id)
  where user_id is not null;

-- RLS
alter table public.reframe_sessions enable row level security;

-- Users can read their own sessions
create policy "Users read own sessions"
  on public.reframe_sessions for select
  using (auth.uid() = user_id);


-- ============================================
-- rfd_detections: individual RFD detection events
-- ============================================
create table if not exists public.rfd_detections (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  session_id uuid references public.reframe_sessions(id) on delete cascade,
  detection_type text not null check (detection_type in ('inbound', 'outbound')),

  patterns_detected text[],
  severity text check (severity in ('low', 'medium', 'high')),
  explanation text,
  suggestion text,

  user_saw_warning boolean not null default true,
  user_proceeded boolean not null default false
);

-- Index for session lookup
create index if not exists idx_rfd_session on public.rfd_detections(session_id);

-- RLS
alter table public.rfd_detections enable row level security;

-- Users can read RFD detections for their own sessions
create policy "Users read own RFD detections"
  on public.rfd_detections for select
  using (
    exists (
      select 1 from public.reframe_sessions
      where reframe_sessions.id = rfd_detections.session_id
        and reframe_sessions.user_id = auth.uid()
    )
  );


-- ============================================
-- Helper function: increment user reframe count
-- ============================================
create or replace function public.increment_user_reframes(user_uuid uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Placeholder. When user profiles table exists,
  -- increment total_reframes counter there.
  null;
end;
$$;
