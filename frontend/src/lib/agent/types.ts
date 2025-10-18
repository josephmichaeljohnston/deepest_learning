'use client'

export type AgentStatus =
  | 'idle'
  | 'fetching'
  | 'navigating'
  | 'playing'
  | 'paused'
  | 'completed'
  | 'stopped'
  | 'error'

export interface AgentStep {
  // 1-based page number
  page: number
  // Publicly accessible audio file URL returned by an API
  audioUrl: string
  // Optional transcript to display while audio plays
  transcript?: string
  // Optional text to speak using Web Speech API
  ttsText?: string
  // Optional label for UI
  label?: string
  // Simulated speech duration in milliseconds for progress visualization
  speakMs?: number
}

export interface AgentSessionConfig {
  filename: string
  totalPages: number
  strategy?: 'scripted' | 'linear' | 'random'
  pdfUrl?: string
}

export interface AgentControllerState {
  status: AgentStatus
  currentStepIndex: number
  steps: AgentStep[]
  error?: string
}
