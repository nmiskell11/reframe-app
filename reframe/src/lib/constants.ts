// reFrame Brand Design Tokens
export const BRAND = {
  colors: {
    coral: '#FF7F50',
    coralLight: '#FFB090',
    coralDark: '#FF6347',
    navy: '#2F3C7E',
    navyLight: '#4A5BA0',
    rfdRed: '#DC2626',
    rfdRedDark: '#B91C1C',
    success: '#16A34A',
    cream: '#FAFAFA',
  },
  tagline: 'Say it better.',
  taglineSecondary: 'Life is about relationships.',
  taglineMission: 'Communication worth inheriting.',
} as const

export const RELATIONSHIP_TYPES = [
  { value: 'romantic_partner', label: 'Partner', emoji: '\uD83D\uDC91' },
  { value: 'parent', label: 'Parent', emoji: '\uD83D\uDC68\u200D\uD83D\uDC69' },
  { value: 'family', label: 'Family', emoji: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66' },
  { value: 'friend', label: 'Friend', emoji: '\uD83E\uDD1D' },
  { value: 'manager', label: 'Manager', emoji: '\uD83D\uDC54' },
  { value: 'direct_report', label: 'Direct Report', emoji: '\uD83D\uDCCA' },
  { value: 'colleague', label: 'Colleague', emoji: '\uD83D\uDCBC' },
  { value: 'client', label: 'Client', emoji: '\uD83E\uDD35' },
  { value: 'neighbor', label: 'Neighbor', emoji: '\uD83C\uDFD8\uFE0F' },
  { value: 'child', label: 'Child/Teen', emoji: '\uD83D\uDC76' },
  { value: 'provider', label: 'Provider', emoji: '\uD83E\uDE7A' },
  { value: 'general', label: 'General', emoji: '\uD83D\uDC64' },
] as const

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number]['value']

export const ALLOWED_RELATIONSHIP_TYPES: readonly string[] = RELATIONSHIP_TYPES.map(
  (r) => r.value
)

export const MAX_MESSAGE_LENGTH = 5000
export const MAX_CONTEXT_LENGTH = 5000
