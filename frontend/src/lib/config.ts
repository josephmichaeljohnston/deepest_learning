// Centralized configuration for backend connectivity
// On a single laptop, default to localhost:8000 where Flask runs.

export const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000'
