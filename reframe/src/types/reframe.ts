import type { RelationshipType } from '@/lib/constants'
import type { HealthCheckResult, RFDResult } from './rfd'

export interface ReframeRequest {
  message: string
  context?: string | null
  relationshipType: RelationshipType
  sessionToken: string
  skipRFD?: boolean
  checkedInbound?: boolean
}

export interface ReframeResponse {
  rfdAlert?: boolean
  rfdResult?: RFDResult
  checkedInbound?: boolean
  healthCheck?: HealthCheckResult | null
  reframed?: string
  relationshipType?: string
  usedContext?: boolean
}
