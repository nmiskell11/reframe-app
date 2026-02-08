'use client'

import type { HealthCheckResult } from '@/types/rfd'

interface HealthAlertModalProps {
  healthCheck: HealthCheckResult
  onContinue: () => void
}

export function HealthAlertModal({ healthCheck, onContinue }: HealthAlertModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-[95%] max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 rounded-t-2xl text-white text-center bg-gradient-to-br from-orange-500 to-amber-500">
          <div className="text-3xl mb-1">{'\u26A0\uFE0F'}</div>
          <h2 className="text-xl font-bold">{healthCheck.alert}</h2>
          <p className="text-sm opacity-90 mt-1">Objective situation assessment</p>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-base text-neutral-700 leading-relaxed">
            {healthCheck.message}
          </p>
          <p className="text-center text-sm mt-4">
            <a
              href="https://www.loveisrespect.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-coral font-semibold hover:underline"
            >
              Learn more about healthy relationships &rarr;
            </a>
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50 rounded-b-2xl">
          <button
            onClick={onContinue}
            className="w-full px-4 py-3 rounded-lg bg-success text-white text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            I Understand, Show Me the Reframe
          </button>
        </div>
      </div>
    </div>
  )
}
