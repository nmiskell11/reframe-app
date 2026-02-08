'use client'

import { useState } from 'react'
import { MAX_CONTEXT_LENGTH } from '@/lib/constants'

interface ContextFieldsProps {
  theirMessage: string
  situationContext: string
  onTheirMessageChange: (value: string) => void
  onSituationContextChange: (value: string) => void
}

export function ContextFields({
  theirMessage,
  situationContext,
  onTheirMessageChange,
  onSituationContextChange,
}: ContextFieldsProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-bold text-neutral-700 cursor-pointer"
      >
        <span
          className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
        >
          ▶
        </span>
        Add conversation context{' '}
        <span className="font-normal text-neutral-400">(optional but recommended)</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-4">
          <p className="text-sm text-neutral-500">
            Adding context helps reFrame understand the full picture and provide a
            more thoughtful, tailored response.
          </p>

          <div>
            <label
              htmlFor="theirMessage"
              className="block text-sm font-semibold mb-1 text-neutral-700"
            >
              What did they say? (exact quote or paraphrase)
            </label>
            <textarea
              id="theirMessage"
              rows={3}
              maxLength={MAX_CONTEXT_LENGTH}
              value={theirMessage}
              onChange={(e) => onTheirMessageChange(e.target.value)}
              placeholder={`Paste their exact text, email, or what they said:\n'I'm tired of you being late to everything. It's disrespectful and I don't think you care about my time.'`}
              className="w-full rounded-lg border-2 border-neutral-200 px-4 py-3 text-sm font-serif focus:border-coral focus:outline-none resize-y"
            />
            <p className="text-xs text-neutral-400 mt-1">
              Exact quotes help RFD detect manipulation, gaslighting, or toxic patterns in{' '}
              <em>their</em> message
            </p>
          </div>

          <div>
            <label
              htmlFor="situationContext"
              className="block text-sm font-semibold mb-1 text-neutral-700"
            >
              Describe the situation (background or what happened)
            </label>
            <textarea
              id="situationContext"
              rows={3}
              maxLength={MAX_CONTEXT_LENGTH}
              value={situationContext}
              onChange={(e) => onSituationContextChange(e.target.value)}
              placeholder={`Provide background or context:\n'My boss criticized my presentation in front of the whole team without giving me a chance to explain.'`}
              className="w-full rounded-lg border-2 border-neutral-200 px-4 py-3 text-sm font-serif focus:border-coral focus:outline-none resize-y"
            />
            <p className="text-xs text-neutral-400 mt-1">
              Situation details help us understand dynamics and craft a response that fits
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
