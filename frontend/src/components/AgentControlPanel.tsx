'use client'

import React from 'react'
import { AgentControllerApi } from '@/lib/agent/useAgentController'

interface Props {
  agent: AgentControllerApi
  ready?: boolean // when false, disable start until PDF metadata is ready
}

export default function AgentControlPanel({ agent, ready = true }: Props) {
  const { state, currentStep } = agent
  // Enable Start only when no active session is running
  const canStart =
    ready && (state.status === 'idle' || state.status === 'stopped' || state.status === 'completed' || state.status === 'error')
  // Removed manual pause/resume controls from dev tools

  return (
    <div className="border-t pt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Controls</h3>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => agent.start()}
          disabled={!canStart}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {state.status === 'fetching' ? 'Starting…' : 'Start Agent'}
        </button>

        {/* Pause/Resume controls removed */}

        <button
          onClick={() => agent.stop()}
          disabled={state.status === 'idle' || state.status === 'stopped'}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Stop
        </button>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-800">
          <strong>Status:</strong> {state.status}
          {state.error && <span className="text-red-600 ml-2">{state.error}</span>}
        </p>
        {!ready && (
          <p className="text-sm text-gray-600 mt-1">PDF is still loading… Start will be enabled when total pages are known.</p>
        )}
        {currentStep && (
          <p className="text-sm text-gray-800 mt-1">
            <strong>Current Step:</strong> Page {currentStep.page}
            {currentStep.transcript && (
              <span className="block text-gray-600 mt-1">“{currentStep.transcript}”</span>
            )}
          </p>
        )}

        {/* Progress tracking removed from dev tools */}

        {/* Slide jump buttons removed to prevent manual skipping */}
      </div>
    </div>
  )
}
