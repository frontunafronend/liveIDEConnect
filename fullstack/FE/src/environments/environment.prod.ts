export const env = {
  production: true,
  apiBaseUrl: process.env['API_BASE_URL'] || 'https://liveideconnect-production.up.railway.app/api',
  wsUrl: process.env['WS_URL'] || 'wss://liveideconnect-production.up.railway.app/ws'
};

// Legacy export for compatibility
export const environment = env;

