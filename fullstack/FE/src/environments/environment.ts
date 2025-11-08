export const env = {
  production: false,
  // Use Railway backend for development (or change back to localhost:4000 if running backend locally)
  apiBaseUrl: 'https://liveideconnect-production.up.railway.app/api',
  wsUrl: 'wss://liveideconnect-production.up.railway.app/ws'
};

// Legacy export for compatibility
export const environment = env;

