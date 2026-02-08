'use client'

import { useState } from 'react'

interface ReframeResultProps {
  reframed: string
  relationshipType: string
}

const R3_EXPLANATIONS: Record<string, string> = {
  romantic_partner:
    "This reframe uses vulnerable 'I' statements to share feelings without blame. It creates space for connection by expressing needs clearly while protecting both people's dignity.",
  parent:
    'This reframe balances respect for your parent with your adult boundaries. It acknowledges the relationship while clearly stating your perspective.',
  family:
    'This reframe preserves family bonds while addressing the issue directly. It uses language that invites dialogue rather than creates distance.',
  friend:
    "This reframe maintains the friendship's honesty while being constructive. Friends can handle direct communication when it's delivered with care.",
  manager:
    "This reframe keeps it professional while being clear about your needs. It focuses on solutions and maintains your working relationship.",
  direct_report:
    'This reframe balances authority with empathy. It addresses performance while supporting growth and maintaining psychological safety.',
  colleague:
    "This reframe keeps things collaborative and respectful. It addresses the issue without creating workplace tension.",
  client:
    "This reframe prioritizes customer satisfaction while setting appropriate boundaries. It's professional and solution-focused.",
  neighbor:
    "This reframe maintains community harmony while being firm about boundaries. It's friendly but clear.",
  child:
    "This reframe teaches emotional regulation through modeling. It's patient, clear, and sets an example of healthy communication.",
  provider:
    "This reframe balances advocacy for your needs with respect for your provider's expertise. It clearly states concerns while keeping the door open for collaborative care.",
  general:
    'This reframe follows the R\u00b3 Framework: REGULATED (calm approach), RESPECTFUL (protects dignity), REPAIRABLE (leaves room for connection).',
}

export function ReframeResult({ reframed, relationshipType }: ReframeResultProps) {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(reframed)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleFeedback(type: string) {
    setFeedback(type)
    if (type === 'explain') {
      setShowExplanation(true)
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <label className="block text-sm font-bold text-neutral-700">
        Your reFramed Message
      </label>

      <div className="bg-green-50 border-l-4 border-success rounded-lg p-5 text-[15px] leading-relaxed text-neutral-800 whitespace-pre-wrap">
        {reframed}
      </div>

      <button
        onClick={handleCopy}
        className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-sm font-semibold text-neutral-600 transition-colors"
      >
        {copied ? 'Copied!' : 'Copy to Clipboard'}
      </button>

      {!feedback && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-neutral-600">
            How does this reFrame feel?
          </h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => handleFeedback('feels_right')}
              className="flex-1 px-4 py-3 rounded-lg border-2 border-neutral-200 hover:border-coral text-sm font-semibold transition-colors"
            >
              This feels right
            </button>
            <button
              onClick={() => handleFeedback('try_again')}
              className="flex-1 px-4 py-3 rounded-lg border-2 border-neutral-200 hover:border-coral text-sm font-semibold transition-colors"
            >
              Let me try again
            </button>
            <button
              onClick={() => handleFeedback('explain')}
              className="flex-1 px-4 py-3 rounded-lg border-2 border-neutral-200 hover:border-coral text-sm font-semibold transition-colors"
            >
              Show me why this works
            </button>
          </div>
        </div>
      )}

      {feedback && !showExplanation && (
        <p className="text-sm text-neutral-500">
          Thank you! Your feedback helps us improve.
        </p>
      )}

      {showExplanation && (
        <div className="bg-coral/5 border-l-4 border-coral rounded-lg p-4 text-sm text-neutral-700 leading-relaxed">
          <strong>Why this works:</strong>
          <br />
          {R3_EXPLANATIONS[relationshipType] || R3_EXPLANATIONS.general}
        </div>
      )}

      <p className="text-center text-sm italic text-neutral-400">
        Remember: Repair is a responsibility, not a weakness.
      </p>
    </div>
  )
}
