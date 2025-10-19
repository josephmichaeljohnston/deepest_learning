// Centralized configuration for backend connectivity
// Backend URL can be configured via NEXT_PUBLIC_BACKEND_URL environment variable
// Default to localhost:8000 where Flask runs (works for both Docker and local)

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
