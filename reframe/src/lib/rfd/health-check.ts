import type { RelationshipType } from '@/lib/constants'
import type { HealthCheckResult } from '@/types/rfd'

/**
 * Rule-based relationship health check.
 * Detects objectively problematic situations (not communication patterns).
 * Runs before AI-based RFD detection.
 */
export function checkRelationshipHealth(
  context: string | null | undefined,
  message: string,
  relationshipType: RelationshipType
): HealthCheckResult | null {
  if (!context && !message) return null

  const combinedText = `${context || ''} ${message || ''}`.toLowerCase()
  const contextLower = (context || '').toLowerCase()

  // Check for "other person" scenario
  const otherPersonKeywords =
    /girlfriend|boyfriend|married|wife|husband|partner.*has.*girlfriend|partner.*has.*boyfriend|seeing someone|in a relationship|dating someone/i
  const secretKeywords =
    /secret|hide|don't tell|can't break up|awkward to break up|waiting to break up/i

  if (otherPersonKeywords.test(combinedText) && secretKeywords.test(combinedText)) {
    if (relationshipType === 'child') {
      const parentGuidanceKeywords =
        /deserve better|first choice|respect yourself|healthy relationship|concerned|worried about you/i
      if (parentGuidanceKeywords.test(contextLower)) {
        return null
      }
    }

    return {
      type: 'other_person',
      severity: 'high',
      alert: '\u26A0\uFE0F Relationship Health Concern',
      message:
        'Being romantically involved with someone who is in a committed relationship puts you in a compromised position. Regardless of the reasons given ("awkward," "waiting for the right time"), this situation is unlikely to be healthy for anyone involved. You deserve to be someone\'s first choice, not a secret or a backup plan.',
    }
  }

  // Check for age-inappropriate relationships
  if (relationshipType === 'child' || relationshipType === 'parent') {
    const ageGapKeywords = /much older|adult.*relationship|age.*gap|[0-9]{2}.*years.*older/i
    if (ageGapKeywords.test(combinedText)) {
      return {
        type: 'age_concern',
        severity: 'high',
        alert: '\u26A0\uFE0F Safety Concern',
        message:
          "If you're in a relationship with someone significantly older, this raises important safety questions. Please talk to a trusted adult about this situation.",
      }
    }
  }

  // Check for controlling behavior
  const controlKeywords =
    /track.*phone|check.*phone|monitor.*location|can't see.*friends|isolate|control.*who.*talk/i
  if (controlKeywords.test(combinedText)) {
    return {
      type: 'controlling',
      severity: 'high',
      alert: '\u26A0\uFE0F Relationship Health Concern',
      message:
        'Controlling behaviors like tracking your phone, monitoring your location, or limiting who you can see are warning signs of an unhealthy relationship. Everyone deserves privacy and autonomy.',
    }
  }

  return null
}
