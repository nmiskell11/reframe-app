export type PatternType =
  | 'criticism'
  | 'contempt'
  | 'defensiveness'
  | 'stonewalling'
  | 'gaslighting'
  | 'manipulation'
  | 'threats'

export type Severity = 'low' | 'medium' | 'high'

export type DetectionDirection = 'inbound' | 'outbound'

export interface DetectedPattern {
  type: string
  severity: Severity
  evidence?: string
  explanation?: string
}

export interface RFDResult {
  hasRedFlags: boolean
  source: DetectionDirection
  severity?: Severity
  patterns?: string[]
  explanation?: string
  suggestion?: string
  validation?: string // Inbound only — victim validation message
}

export interface HealthCheckResult {
  type: string
  severity: Severity
  alert: string
  message: string
}
