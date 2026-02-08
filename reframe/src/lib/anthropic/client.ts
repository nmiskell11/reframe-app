import Anthropic from '@anthropic-ai/sdk'

export const MODEL = 'claude-sonnet-4-20250514' as const

// Server-only — never import this from client components.
// Lazy-initialized to avoid build-time errors when env vars aren't set.
let _client: Anthropic | null = null

export function getAnthropic(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  }
  return _client
}
