'use client'

import { RELATIONSHIP_TYPES } from '@/lib/constants'
import type { RelationshipType } from '@/lib/constants'

interface RelationshipSelectorProps {
  value: RelationshipType
  onChange: (value: RelationshipType) => void
}

export function RelationshipSelector({ value, onChange }: RelationshipSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-bold mb-2 text-neutral-700">
        Who are you talking to?{' '}
        <span className="font-normal text-neutral-400">(helps us personalize tone)</span>
      </label>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {RELATIONSHIP_TYPES.map((rel) => (
          <label
            key={rel.value}
            className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg border-2 cursor-pointer text-sm transition-all ${
              value === rel.value
                ? 'border-coral bg-coral/10 text-coral font-semibold'
                : 'border-neutral-200 hover:border-coral/40 text-neutral-600'
            }`}
          >
            <input
              type="radio"
              name="relationship"
              value={rel.value}
              checked={value === rel.value}
              onChange={() => onChange(rel.value)}
              className="sr-only"
            />
            <span>{rel.emoji}</span>
            <span>{rel.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
