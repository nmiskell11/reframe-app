import type { RelationshipType } from '@/lib/constants'

export interface RelationshipContext {
  tone: string
  formality: string
  approach: string
}

export const RELATIONSHIP_CONTEXTS: Record<RelationshipType, RelationshipContext> = {
  romantic_partner: {
    tone: 'intimate and vulnerable',
    formality: 'casual',
    approach: "Use 'I' statements, express needs clearly, invite dialogue",
  },
  parent: {
    tone: 'respectful but firm',
    formality: 'moderate',
    approach: 'Balance respect for the relationship with your adult boundaries',
  },
  family: {
    tone: 'warm but direct',
    formality: 'casual to moderate',
    approach: 'Preserve family bonds while addressing issues honestly',
  },
  friend: {
    tone: 'honest and caring',
    formality: 'casual',
    approach: 'Direct communication with care for the friendship',
  },
  manager: {
    tone: 'professional and solution-focused',
    formality: 'formal',
    approach: 'Focus on outcomes, maintain professional boundaries, be respectful',
  },
  direct_report: {
    tone: 'supportive but clear',
    formality: 'professional',
    approach: 'Balance authority with psychological safety, focus on growth',
  },
  colleague: {
    tone: 'collaborative and respectful',
    formality: 'professional',
    approach: 'Keep it constructive, maintain working relationship',
  },
  client: {
    tone: 'professional and solution-oriented',
    formality: 'formal',
    approach: 'Prioritize service excellence while setting boundaries',
  },
  neighbor: {
    tone: 'friendly but firm',
    formality: 'moderate',
    approach: 'Maintain community harmony while being clear about boundaries',
  },
  child: {
    tone: 'patient and teaching-oriented',
    formality: 'simple and clear',
    approach: 'Model healthy communication, teach emotional regulation',
  },
  provider: {
    tone: 'clear and self-advocating',
    formality: 'professional',
    approach: 'Advocate for your needs while respecting expertise, ask questions, express concerns directly',
  },
  general: {
    tone: 'balanced and thoughtful',
    formality: 'moderate',
    approach: 'Maintain dignity while expressing needs clearly',
  },
}
