// Quick test script to connect Cursor IDE to LiveIDEConnect
// Usage: node cursor-connection-test.js

const WebSocket = require('ws');

// ⚠️ REPLACE THESE WITH YOUR ACTUAL VALUES
const SESSION_ID = 'YOUR_SESSION_ID_HERE';
const TOKEN = 'YOUR_JWT_TOKEN_HERE';
const WS_URL = `wss://liveideconnect-production.up.railway.app/ws?sessionId=${SESSION_ID}&token=${TOKEN}`;

console.log('🔌 Connecting to LiveIDEConnect...');
console.log('📍 URL:', WS_URL.replace(TOKEN, '***TOKEN***'));

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ Connected successfully!');
  console.log('📤 Sending test message...');
  
  // Send a test message
  ws.send(JSON.stringify({
    type: 'agent_message',
    from: 'client',
    content: 'Hello from Cursor IDE! This is a test connection.'
  }));
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('\n📨 Received message:');
    console.log('   Type:', message.type);
    console.log('   From:', message.from);
    console.log('   Content:', message.content);
    console.log('   Timestamp:', message.ts);
  } catch (error) {
    console.error('❌ Error parsing message:', error);
  }
});

ws.on('error', (error) => {
  console.error('❌ Connection error:', error.message);
  console.error('   Make sure:');
  console.error('   1. SESSION_ID is correct');
  console.error('   2. TOKEN is valid (not expired)');
  console.error('   3. Session exists and belongs to your user');
});

ws.on('close', (code, reason) => {
  console.log('\n🔌 Disconnected');
  console.log('   Code:', code);
  console.log('   Reason:', reason.toString());
  process.exit(0);
});

// Keep script running
process.on('SIGINT', () => {
  console.log('\n👋 Closing connection...');
  ws.close();
  process.exit(0);
});

