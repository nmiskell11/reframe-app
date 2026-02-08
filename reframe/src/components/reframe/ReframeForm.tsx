'use client'

import { useCallback, useRef, useState } from 'react'
import type { RelationshipType } from '@/lib/constants'
import type { ReframeResponse } from '@/types/reframe'
import type { HealthCheckResult, RFDResult } from '@/types/rfd'
import { MAX_MESSAGE_LENGTH } from '@/lib/constants'
import { useAuth } from '@/components/auth/AuthProvider'
import { RelationshipSelector } from './RelationshipSelector'
import { ContextFields } from './ContextFields'
import { ReframeResult } from './ReframeResult'
import { RFDModal } from './RFDModal'
import { HealthAlertModal } from './HealthAlertModal'

export function ReframeForm() {
  const { sessionToken } = useAuth()

  // Form state
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('general')
  const [message, setMessage] = useState('')
  const [theirMessage, setTheirMessage] = useState('')
  const [situationContext, setSituationContext] = useState('')

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Result state
  const [reframed, setReframed] = useState<string | null>(null)

  // RFD state
  const [rfdResult, setRfdResult] = useState<RFDResult | null>(null)
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult | null>(null)
  const [checkedInbound, setCheckedInbound] = useState(false)
  const [lastAlertSource, setLastAlertSource] = useState<'inbound' | 'outbound' | null>(null)

  const inputRef = useRef<HTMLTextAreaElement>(null)

  function buildContext(): string | null {
    if (theirMessage && situationContext) {
      return `THEIR MESSAGE: "${theirMessage}"\n\nSITUATION: ${situationContext}`
    } else if (theirMessage) {
      return `THEIR MESSAGE: "${theirMessage}"`
    } else if (situationContext) {
      return `SITUATION: ${situationContext}`
    }
    return null
  }

  const callReframe = useCallback(
    async (skipRFD: boolean) => {
      if (!message.trim()) {
        setError('Please enter a message to reframe')
        return
      }
      if (message.length > MAX_MESSAGE_LENGTH) {
        setError(`Message must be under ${MAX_MESSAGE_LENGTH} characters`)
        return
      }

      setError(null)
      setIsLoading(true)
      setReframed(null)

      try {
        const context = buildContext()
        const res = await fetch('/api/reframe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message.trim(),
            context,
            relationshipType,
            sessionToken,
            skipRFD,
            checkedInbound,
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to reframe message')
        }

        const data: ReframeResponse = await res.json()

        // RFD alert
        if (data.rfdAlert && data.rfdResult) {
          setLastAlertSource(data.rfdResult.source)
          if (data.checkedInbound) setCheckedInbound(true)
          setRfdResult(data.rfdResult)
          if (data.healthCheck) setHealthCheck(data.healthCheck)
          return
        }

        // Health alert (non-blocking — reframe still returned)
        if (data.healthCheck) {
          setHealthCheck(data.healthCheck)
        }

        // Success
        if (data.reframed) {
          setReframed(data.reframed)
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Something went wrong. Please try again.'
        )
      } finally {
        setIsLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [message, theirMessage, situationContext, relationshipType, sessionToken, checkedInbound]
  )

  function handleRFDEdit() {
    setRfdResult(null)
    setCheckedInbound(false)
    setLastAlertSource(null)
    inputRef.current?.focus()
  }

  function handleRFDProceed() {
    setRfdResult(null)
    if (lastAlertSource === 'inbound') {
      callReframe(false) // check outbound next
    } else {
      // outbound — skip and reframe
      setCheckedInbound(false)
      setLastAlertSource(null)
      callReframe(true)
    }
  }

  function handleHealthAlertContinue() {
    setHealthCheck(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      callReframe(false)
    }
  }

  return (
    <>
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8 space-y-6">
        <div className="bg-coral/5 border-l-4 border-coral rounded-lg p-4 text-sm text-neutral-700">
          <h3 className="font-bold mb-1">How to Use reFrame</h3>
          <p>
            Type your raw, honest thoughts below. Whether you&apos;re hurt, angry,
            frustrated, or confused &mdash; we&apos;ll help you express it in a way that
            builds connection instead of conflict.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <RelationshipSelector value={relationshipType} onChange={setRelationshipType} />

        <ContextFields
          theirMessage={theirMessage}
          situationContext={situationContext}
          onTheirMessageChange={setTheirMessage}
          onSituationContextChange={setSituationContext}
        />

        <div>
          <label
            htmlFor="inputText"
            className="block text-sm font-bold mb-2 text-neutral-700"
          >
            What do you want to say?
          </label>
          <textarea
            ref={inputRef}
            id="inputText"
            rows={5}
            maxLength={MAX_MESSAGE_LENGTH}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Be honest about how you're feeling. Type the message you want to send — we'll help you say it in a way that opens dialogue instead of closing it.\n\nExample: 'You never listen to me and I'm sick of repeating myself. You clearly don't care about what I have to say.'`}
            className="w-full rounded-lg border-2 border-neutral-200 px-4 py-3 text-sm font-serif focus:border-coral focus:outline-none resize-y"
          />
        </div>

        <button
          onClick={() => callReframe(false)}
          disabled={isLoading || !message.trim()}
          className="w-full py-4 rounded-xl bg-coral text-white font-bold text-base hover:bg-coral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Reframing your message...' : 'reFrame This Message'}
        </button>

        {isLoading && (
          <p className="text-center text-sm text-neutral-500 animate-pulse">
            Reframing your message with dignity and clarity...
          </p>
        )}

        {reframed && (
          <ReframeResult reframed={reframed} relationshipType={relationshipType} />
        )}
      </div>

      {/* Modals */}
      {rfdResult && (
        <RFDModal
          rfdResult={rfdResult}
          onEdit={handleRFDEdit}
          onProceed={handleRFDProceed}
        />
      )}

      {healthCheck && !rfdResult && (
        <HealthAlertModal
          healthCheck={healthCheck}
          onContinue={handleHealthAlertContinue}
        />
      )}
    </>
  )
}
