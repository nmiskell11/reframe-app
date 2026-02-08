import Anthropic from '@anthropic-ai/sdk'

// Server-only — never import this from client components
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const MODEL = 'claude-sonnet-4-20250514' as const
