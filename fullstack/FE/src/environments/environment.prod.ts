export const env = {
  production: true,
  apiBaseUrl: process.env['API_BASE_URL'] || 'https://api.yourdomain.com/api',
  wsUrl: process.env['WS_URL'] || 'wss://api.yourdomain.com/ws'
};

// Legacy export for compatibility
export const environment = env;

