import type { RelationshipType } from '@/lib/constants'
import { getAnthropic, MODEL } from '@/lib/anthropic/client'
import { RELATIONSHIP_CONTEXTS } from './relationships'
import { sanitizeForPrompt } from './sanitize'

/**
 * Parse user-provided context into structured parts.
 * Supports "THEIR MESSAGE:" and "SITUATION:" prefixed blocks,
 * or falls back to treating the whole string as situation context.
 */
function parseContext(context: string): {
  theirMessage: string
  situationContext: string
} {
  let theirMessage = ''
  let situationContext = ''

  const theirMessageMatch = context.match(/THEIR MESSAGE:\s*"?([^"]*)"?(?:\n|$)/i)
  const situationMatch = context.match(/SITUATION:\s*(.+)/is)

  if (theirMessageMatch) {
    theirMessage = theirMessageMatch[1].trim()
  }
  if (situationMatch) {
    situationContext = situationMatch[1].trim()
  }

  if (!theirMessage && !situationContext) {
    situationContext = context
  }

  return { theirMessage, situationContext }
}

function buildReframePrompt(
  message: string,
  context: string | null | undefined,
  relationshipType: RelationshipType
): string {
  const relationshipContext =
    RELATIONSHIP_CONTEXTS[relationshipType] || RELATIONSHIP_CONTEXTS.general

  let theirMessage = ''
  let situationContext = ''

  if (context) {
    const parsed = parseContext(context)
    theirMessage = parsed.theirMessage
    situationContext = parsed.situationContext
  }

  return `You are a communication coach using the R³ Framework (REGULATED, RESPECTFUL, REPAIRABLE).

RELATIONSHIP TYPE: ${relationshipType}
TONE: ${relationshipContext.tone}
FORMALITY: ${relationshipContext.formality}
APPROACH: ${relationshipContext.approach}

${theirMessage ? `THEIR MESSAGE TO USER (delimited by triple quotes):\n"""\n${sanitizeForPrompt(theirMessage)}\n"""\n\n` : ''}${situationContext ? `SITUATION/BACKGROUND (delimited by triple quotes):\n"""\n${sanitizeForPrompt(situationContext)}\n"""\n\n` : ''}
USER'S RAW MESSAGE (what they want to say, delimited by triple quotes):
"""
${sanitizeForPrompt(message)}
"""

TASK: Reframe the user's message using the R³ Framework:
- REGULATED: Calm, not reactive
- RESPECTFUL: Protects dignity of both parties
- REPAIRABLE: Maintains connection, leaves room for dialogue

REQUIREMENTS:
1. Keep their core feelings and needs intact
2. Remove toxic patterns (criticism, contempt, defensiveness)
3. Use tone appropriate for ${relationshipType} relationship
4. Address the actual situation/context if provided
5. Be direct and honest, not fake or overly nice
6. If their message has legitimate grievances, acknowledge them
7. Focus on specific behaviors, not character attacks

Respond with ONLY the reframed message (no preamble, no explanation).`
}

export async function reframeMessage(
  message: string,
  context: string | null | undefined,
  relationshipType: RelationshipType
): Promise<string> {
  const prompt = buildReframePrompt(message, context, relationshipType)

  const response = await getAnthropic().messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content.find((b) => b.type === 'text')?.text || ''
  return text.trim()
}
