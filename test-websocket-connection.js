#!/usr/bin/env node
/**
 * Quick WebSocket Connection Test
 * 
 * Tests WebSocket connection to your chat session
 * 
 * Usage:
 *   1. Get Session ID from chat URL (the part after /chat/)
 *   2. Update SESSION_ID below
 *   3. Make sure TOKEN is set (from test-token-locally.js)
 *   4. Run: node test-websocket-connection.js
 */

const WebSocket = require('ws');

// ============================================
// ⚙️ CONFIGURATION
// ============================================
// Use LOCAL backend (change to production URLs if needed)
const WS_BASE = 'ws://localhost:4000'; // Local: ws://localhost:4000 | Production: wss://liveideconnect-production.up.railway.app

// Get Session ID from chat URL (the part after /chat/)
// Example: http://localhost:4200/chat/abc-123 → Session ID is: abc-123
const SESSION_ID = '527c6d95-828b-4f47-ab04-be8f3d11aa74';

// Your local token (from test-token-locally.js)
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjMWY3MDlhNy02MzgyLTQxNTQtYTczOC0xZTEzZTEyYWRlYmIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc2MzM4MDIyNywiZXhwIjoxNzYzOTg1MDI3fQ.9GQkB1BR_KBSXrGIhUAeyZgqvDtyFww0DEa1kfFkFn0';

// ============================================
// 🧪 TEST CONNECTION
// ============================================

if (!SESSION_ID || SESSION_ID === 'YOUR_SESSION_ID_HERE') {
  console.error('❌ ERROR: Please set your SESSION_ID');
  console.error('   Get it from the chat URL (the part after /chat/)');
  console.error('   Example: http://localhost:4200/chat/abc-123 → Session ID is: abc-123');
  process.exit(1);
}

const wsUrl = `${WS_BASE}/ws?sessionId=${SESSION_ID}&token=${TOKEN}`;

console.log('🧪 Testing WebSocket Connection');
console.log('='.repeat(50));
console.log('');
console.log('📋 Connection Details:');
console.log('   Session ID:', SESSION_ID);
console.log('   WebSocket URL:', wsUrl.replace(TOKEN, '***TOKEN***'));
console.log('');

const ws = new WebSocket(wsUrl);

let messageCount = 0;

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully!');
  console.log('');
  console.log('📤 Sending test message...');
  
  // Send a test message
  const testMessage = {
    type: 'agent_message',
    from: 'ide',
    content: 'Hello from Cursor IDE! This is a test connection.',
    sessionId: SESSION_ID
  };
  
  ws.send(JSON.stringify(testMessage));
  console.log('   Message sent:', testMessage.content);
  console.log('');
  console.log('💡 Waiting for responses... (Press Ctrl+C to exit)');
  console.log('');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    messageCount++;
    console.log(`📨 Message #${messageCount}:`);
    console.log('   Type:', message.type);
    console.log('   From:', message.from);
    console.log('   Content:', message.content);
    if (message.ts) {
      console.log('   Timestamp:', new Date(message.ts).toLocaleString());
    }
    console.log('');
  } catch (error) {
    console.error('❌ Error parsing message:', error.message);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  console.error('');
  console.error('💡 Troubleshooting:');
  console.error('   1. Check if SESSION_ID is correct');
  console.error('   2. Check if TOKEN is valid');
  console.error('   3. Make sure backend is running (for local: cd fullstack/BE && npm run dev)');
  console.error('   4. Verify the session exists and belongs to your user');
});

ws.on('close', (code, reason) => {
  console.log('');
  console.log('🔌 Connection closed');
  console.log('   Code:', code);
  if (reason) {
    console.log('   Reason:', reason.toString());
  }
  if (messageCount > 0) {
    console.log(`   Total messages received: ${messageCount}`);
  }
  process.exit(0);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('');
  console.log('👋 Closing connection...');
  ws.close();
});

