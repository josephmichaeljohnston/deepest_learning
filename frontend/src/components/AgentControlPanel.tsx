'use client'

import React from 'react'
import { AgentControllerApi } from '@/lib/agent/useAgentController'

interface Props {
  agent: AgentControllerApi
  ready?: boolean // when false, disable start until PDF metadata is ready
}

export default function AgentControlPanel({ agent, ready = true }: Props) {
  const { state, currentStep, progress } = agent
  const disableStart = !ready || state.status === 'playing' || state.status === 'navigating' || state.status === 'fetching'
  const canPause = state.status === 'playing'
  const canResume = state.status === 'paused'

  return (
    <div className="border-t pt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Agentic Controls (Simulated API)</h3>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => agent.start()}
          disabled={disableStart}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {state.status === 'fetching' ? 'Fetching Plan…' : 'Start Agent'}
        </button>

        <button
          onClick={() => agent.pause()}
          disabled={!canPause}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Pause
        </button>

        <button
          onClick={() => agent.resume()}
          disabled={!canResume}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Resume
        </button>

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

        {/* Simulated speech progress bar */}
        {currentStep && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Speech Progress</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="w-full h-2 rounded bg-white border border-blue-200 overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-[width] duration-100 ease-linear"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        )}

        {state.steps.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {state.steps.map((s, i) => (
              <button
                key={`${s.page}-${i}`}
                onClick={() => agent.jumpTo(i)}
                className={`px-3 py-1 rounded border text-sm ${
                  i === state.currentStepIndex
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {s.label ?? `Page ${s.page}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
