'use client'

import type { RFDResult } from '@/types/rfd'

interface RFDModalProps {
  rfdResult: RFDResult
  onEdit: () => void
  onProceed: () => void
}

export function RFDModal({ rfdResult, onEdit, onProceed }: RFDModalProps) {
  const isInbound = rfdResult.source === 'inbound'

  const severityStyles: Record<string, string> = {
    high: 'bg-red-100 text-red-900',
    medium: 'bg-orange-100 text-orange-900',
    low: 'bg-yellow-100 text-yellow-900',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onEdit()
      }}
    >
      <div className="bg-white rounded-2xl w-[95%] max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div
          className={`px-6 py-5 rounded-t-2xl text-white text-center ${
            isInbound
              ? 'bg-gradient-to-br from-red-600 to-red-500'
              : 'bg-gradient-to-br from-rfd-red to-rfd-red-dark'
          }`}
        >
          <div className="text-3xl mb-1">{isInbound ? '\uD83D\uDEE1\uFE0F' : '\uD83D\uDEA9'}</div>
          <h2 className="text-xl font-bold">
            {isInbound ? 'Inbound RFD Alert' : 'Outbound RFD Alert'}
          </h2>
          <p className="text-sm opacity-90 mt-1">
            {isInbound
              ? 'Pattern detected in what they said to you'
              : "Pattern detected in what you're about to send"}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Severity badge */}
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
              severityStyles[rfdResult.severity ?? 'medium']
            }`}
          >
            {rfdResult.severity} severity
          </span>

          {/* Source indicator */}
          <div
            className={`border-l-4 rounded-lg p-3 text-sm ${
              isInbound
                ? 'bg-red-50 border-red-400 text-red-900'
                : 'bg-orange-50 border-amber-400 text-amber-900'
            }`}
          >
            <strong className="block text-xs uppercase tracking-wider mb-1">
              {isInbound
                ? 'Analysis of their message'
                : 'Analysis of your message'}
            </strong>
            {isInbound
              ? 'This pattern appears in what they said to you. Below is how you can respond.'
              : 'These patterns may harm the relationship. Consider the healthier alternative below.'}
          </div>

          {/* Patterns */}
          <div className="bg-red-50 border-l-4 border-rfd-red rounded-lg p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rfd-red mb-2">
              {isInbound ? "What They're Using" : "What You're Using"}
            </h4>
            <ul className="space-y-1">
              {rfdResult.patterns?.map((pattern, i) => (
                <li key={i} className="text-sm text-red-900">
                  {pattern}
                </li>
              ))}
            </ul>
          </div>

          {/* Explanation */}
          <p className="text-sm text-neutral-700 leading-relaxed">
            {rfdResult.explanation}
          </p>

          {/* Suggestion */}
          <div className="bg-green-50 border-l-4 border-success rounded-lg p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-success mb-2">
              {isInbound ? 'How You Can Respond' : 'Healthier Way to Say It'}
            </h4>
            <p className="text-sm text-green-900 leading-relaxed">
              {rfdResult.suggestion}
            </p>
          </div>

          {/* Validation (inbound only) */}
          {isInbound && rfdResult.validation && (
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-2">
                Remember
              </h4>
              <p className="text-sm text-blue-900 leading-relaxed">
                {rfdResult.validation}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50 rounded-b-2xl flex flex-col sm:flex-row gap-3">
          <button
            onClick={onEdit}
            className="flex-1 px-4 py-3 rounded-lg border-2 border-neutral-200 text-sm font-semibold text-neutral-600 hover:border-neutral-400 transition-colors"
          >
            Edit My Message
          </button>
          <button
            onClick={onProceed}
            className="flex-1 px-4 py-3 rounded-lg bg-success text-white text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            Continue to reFrame
          </button>
        </div>
      </div>
    </div>
  )
}
