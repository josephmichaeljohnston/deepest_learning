// This module is deprecated and no longer needed.
// Use backendApi.fetchStepFromBackend instead for sequential on-demand page loading.
export function fetchAgentPlan(): never {
  throw new Error('Mock planner removed. Use fetchStepFromBackend from ./backendApi')
}
