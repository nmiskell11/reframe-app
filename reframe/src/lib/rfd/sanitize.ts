import { MAX_MESSAGE_LENGTH } from '@/lib/constants'

/**
 * Sanitize user input before embedding in LLM prompts.
 * Escapes sequences that could break out of delimited blocks.
 */
export function sanitizeForPrompt(input: string | null | undefined): string {
  if (!input) return ''
  return input
    .replace(/"""/g, "'\"'")
    .replace(/```/g, "'''")
    .slice(0, MAX_MESSAGE_LENGTH)
}
