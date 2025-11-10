#!/usr/bin/env node
/**
 * LiveIDEConnect - Cursor IDE Connection Test
 * 
 * This script tests the WebSocket connection from your PC to LiveIDEConnect
 * 
 * Usage:
 *   1. Install dependencies: npm install ws
 *   2. Edit this file and replace SESSION_ID and TOKEN below
 *   3. Run: node test-cursor-connection.js
 */

const WebSocket = require('ws');
const https = require('https');

// ============================================
// ⚙️ CONFIGURATION - REPLACE THESE VALUES
// ============================================
const API_BASE = 'https://liveideconnect-production.up.railway.app';
const WS_BASE = 'wss://liveideconnect-production.up.railway.app';

// Get these from the web app:
// 1. Token: Open browser console on https://live-ide-connect.vercel.app
//    Run: sessionStorage.getItem('auth_token')
const TOKEN = 'YOUR_JWT_TOKEN_HERE';

// 2. Session ID: Create a session via web UI or use an existing one
//    Or leave empty to auto-create one
const SESSION_ID = 'YOUR_SESSION_ID_HERE'; // Leave empty to auto-create

// ============================================
// 🧪 TEST FUNCTIONS
// ============================================

/**
 * Create a session via API
 */
function createSession(token, sessionName = 'Cursor IDE Test Session') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      name: sessionName,
      status: 'online'
    });

    const options = {
      hostname: 'liveideconnect-production.up.railway.app',
      path: '/api/sessions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 201) {
          const session = JSON.parse(data);
          console.log('✅ Session created successfully!');
          console.log('   ID:', session.id);
          console.log('   Name:', session.name);
          resolve(session.id);
        } else {
          console.error('❌ Failed to create session');
          console.error('   Status:', res.statusCode);
          console.error('   Response:', data);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Test WebSocket connection
 */
function testWebSocketConnection(sessionId, token) {
  return new Promise((resolve, reject) => {
    const wsUrl = `${WS_BASE}/ws?sessionId=${sessionId}&token=${token}`;
    
    console.log('\n🔌 Connecting to WebSocket...');
    console.log('   URL:', wsUrl.replace(token, '***TOKEN***'));
    console.log('   Session ID:', sessionId);

    const ws = new WebSocket(wsUrl);

    let connected = false;
    let messageReceived = false;

    const timeout = setTimeout(() => {
      if (!connected) {
        console.error('❌ Connection timeout (10 seconds)');
        ws.close();
        reject(new Error('Connection timeout'));
      }
    }, 10000);

    ws.on('open', () => {
      connected = true;
      clearTimeout(timeout);
      console.log('✅ WebSocket connected successfully!');
      console.log('📤 Sending test message...');

      // Send a test message
      const testMessage = {
        type: 'agent_message',
        from: 'ide',
        content: 'Hello from Cursor IDE! This is a test connection.',
        sessionId: sessionId
      };

      ws.send(JSON.stringify(testMessage));
      console.log('   Message sent:', testMessage.content);

      // Wait a bit for response, then close
      setTimeout(() => {
        if (messageReceived) {
          console.log('\n✅ Test completed successfully!');
          console.log('   ✓ Connection established');
          console.log('   ✓ Message sent');
          console.log('   ✓ Message received');
          resolve();
        } else {
          console.log('\n⚠️  Test completed (no response received, but connection works)');
          resolve();
        }
        ws.close();
      }, 3000);
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        messageReceived = true;
        console.log('\n📨 Received message:');
        console.log('   Type:', message.type);
        console.log('   From:', message.from);
        console.log('   Content:', message.content);
        if (message.ts) {
          console.log('   Timestamp:', message.ts);
        }
      } catch (error) {
        console.error('❌ Error parsing message:', error.message);
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.error('\n❌ WebSocket error:', error.message);
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check if TOKEN is valid (not expired)');
      console.error('   2. Check if SESSION_ID exists and belongs to your user');
      console.error('   3. Check your internet connection');
      console.error('   4. Verify the backend is running:', API_BASE);
      reject(error);
    });

    ws.on('close', (code, reason) => {
      if (code === 1000) {
        console.log('\n🔌 Connection closed normally');
      } else {
        console.log('\n🔌 Connection closed');
        console.log('   Code:', code);
        console.log('   Reason:', reason.toString());
      }
    });
  });
}

// ============================================
// 🚀 MAIN TEST RUNNER
// ============================================

async function runTest() {
  console.log('🧪 LiveIDEConnect - Cursor IDE Connection Test');
  console.log('=' .repeat(50));
  console.log('');

  // Validate token
  if (!TOKEN || TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.error('❌ ERROR: Please set your TOKEN in the script');
    console.error('   Get it from: https://live-ide-connect.vercel.app');
    console.error('   Run in browser console: sessionStorage.getItem(\'auth_token\')');
    process.exit(1);
  }

  let sessionId = SESSION_ID;

  // Auto-create session if not provided
  if (!sessionId || sessionId === 'YOUR_SESSION_ID_HERE') {
    console.log('📝 No session ID provided, creating a new session...');
    try {
      sessionId = await createSession(TOKEN);
    } catch (error) {
      console.error('\n❌ Failed to create session. Please create one manually:');
      console.error('   1. Go to: https://live-ide-connect.vercel.app/sessions');
      console.error('   2. Click "+ New Session"');
      console.error('   3. Copy the Session ID from the URL');
      console.error('   4. Update SESSION_ID in this script');
      process.exit(1);
    }
  }

  // Test WebSocket connection
  try {
    await testWebSocketConnection(sessionId, TOKEN);
    console.log('\n🎉 All tests passed! Your Cursor IDE can connect to LiveIDEConnect.');
    console.log('\n📋 Connection Details:');
    console.log('   Session ID:', sessionId);
    console.log('   WebSocket URL:', `${WS_BASE}/ws`);
    console.log('\n💡 Next Steps:');
    console.log('   1. Use these values in your Cursor IDE extension');
    console.log('   2. The WebSocket connection is working!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection test failed');
    process.exit(1);
  }
}

// Run the test
runTest().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

