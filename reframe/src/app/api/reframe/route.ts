import { NextRequest, NextResponse } from 'next/server'
import {
  ALLOWED_RELATIONSHIP_TYPES,
  MAX_MESSAGE_LENGTH,
  MAX_CONTEXT_LENGTH,
} from '@/lib/constants'
import type { RelationshipType } from '@/lib/constants'
import type { ReframeRequest, ReframeResponse } from '@/types/reframe'
import { detectRedFlags, reframeMessage, checkRelationshipHealth } from '@/lib/rfd'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  let body: ReframeRequest

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    message,
    context,
    relationshipType: rawRelType = 'general',
    sessionToken,
    skipRFD = false,
    checkedInbound = false,
  } = body

  // --- Validation ---

  if (!message || message.trim() === '') {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message must be under ${MAX_MESSAGE_LENGTH} characters` },
      { status: 400 }
    )
  }

  if (context && context.length > MAX_CONTEXT_LENGTH) {
    return NextResponse.json(
      { error: `Context must be under ${MAX_CONTEXT_LENGTH} characters` },
      { status: 400 }
    )
  }

  const relationshipType: RelationshipType = ALLOWED_RELATIONSHIP_TYPES.includes(rawRelType)
    ? (rawRelType as RelationshipType)
    : 'general'

  // --- Health check (rule-based, fast) ---

  const healthCheck = checkRelationshipHealth(context, message, relationshipType)

  // --- Supabase session (fire-and-forget) ---

  let sessionId: string | null = null
  try {
    const { data: session } = await getSupabaseAdmin()
      .from('reframe_sessions')
      .insert({
        session_token: sessionToken || null,
        relationship_type: relationshipType,
        had_context: !!context && context.trim().length > 0,
        context_length: context ? context.length : 0,
        message_length: message.length,
      })
      .select('id')
      .single()
    sessionId = session?.id ?? null
  } catch (dbError) {
    console.error('Session creation error (non-blocking):', dbError)
  }

  // --- STEP 1: Inbound RFD ---

  if (!skipRFD && !checkedInbound && context) {
    const theirMessageMatch = context.match(
      /THEIR MESSAGE:\s*["']*(.*?)["']*(?:\n\n|$)/is
    )
    let theirMessage = theirMessageMatch ? theirMessageMatch[1].trim().replace(/^["']+|["']+$/g, '') : ''

    if (theirMessage && theirMessage.length > 10) {
      const inboundRFD = await detectRedFlags(
        theirMessage,
        'inbound',
        relationshipType,
        context ?? undefined
      )

      if (inboundRFD.hasRedFlags) {
        // Log to DB (fire-and-forget)
        if (sessionId) {
          logRFD(sessionId, 'inbound', inboundRFD).catch(() => {})
        }

        const response: ReframeResponse = {
          rfdAlert: true,
          rfdResult: inboundRFD,
          checkedInbound: true,
          healthCheck,
        }
        return NextResponse.json(response)
      }
    }
  }

  // --- STEP 2: Outbound RFD ---

  if (!skipRFD) {
    const outboundRFD = await detectRedFlags(
      message,
      'outbound',
      relationshipType,
      context ?? undefined
    )

    if (outboundRFD.hasRedFlags) {
      if (sessionId) {
        logRFD(sessionId, 'outbound', outboundRFD).catch(() => {})
      }

      const response: ReframeResponse = {
        rfdAlert: true,
        rfdResult: outboundRFD,
        healthCheck,
      }
      return NextResponse.json(response)
    }
  }

  // --- STEP 3: Reframe ---

  try {
    const reframed = await reframeMessage(message, context, relationshipType)

    const response: ReframeResponse = {
      reframed,
      relationshipType,
      usedContext: !!context,
      healthCheck,
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Reframe error:', error)
    return NextResponse.json({ error: 'Failed to reframe message' }, { status: 500 })
  }
}

// --- DB helpers (fire-and-forget) ---

async function logRFD(
  sessionId: string,
  type: 'inbound' | 'outbound',
  rfd: { patterns?: string[]; severity?: string; explanation?: string; suggestion?: string }
) {
  const updateField = type === 'inbound' ? 'rfd_inbound' : 'rfd_outbound'
  await Promise.all([
    getSupabaseAdmin()
      .from('reframe_sessions')
      .update({
        [`${updateField}_triggered`]: true,
        [`${updateField}_patterns`]: rfd.patterns,
        [`${updateField}_severity`]: rfd.severity,
      })
      .eq('id', sessionId),
    getSupabaseAdmin().from('rfd_detections').insert({
      session_id: sessionId,
      detection_type: type,
      patterns_detected: rfd.patterns,
      severity: rfd.severity,
      explanation: rfd.explanation,
      suggestion: rfd.suggestion,
      user_saw_warning: true,
    }),
  ])
}
