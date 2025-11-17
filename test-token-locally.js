#!/usr/bin/env node
/**
 * Test Token Locally - Verify JWT token works with local IDE
 * 
 * This script tests if a token from production works with your local backend
 * 
 * Usage:
 *   1. Get your token from production: https://live-ide-connect.vercel.app
 *      - Open browser console
 *      - Run: sessionStorage.getItem('auth_token')
 *   2. Update TOKEN below
 *   3. Make sure your local backend is running (npm run dev in fullstack/BE)
 *   4. Run: node test-token-locally.js
 */

const https = require('https');
const http = require('http');

// ============================================
// ⚙️ CONFIGURATION
// ============================================
const LOCAL_API = 'http://localhost:4000/api';
const PROD_API = 'https://liveideconnect-production.up.railway.app/api';

// Get token from production app:
// 1. Go to: https://live-ide-connect.vercel.app
// 2. Open brosessionStorage.getItem('auth_token')wser console (F12)
// 3. Run: sessionStorage.getItem('auth_token')
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjMWY3MDlhNy02MzgyLTQxNTQtYTczOC0xZTEzZTEyYWRlYmIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc2MzM4MDIyNywiZXhwIjoxNzYzOTg1MDI3fQ.9GQkB1BR_KBSXrGIhUAeyZgqvDtyFww0DEa1kfFkFn0';

// ============================================
// 🧪 TEST FUNCTIONS
// ============================================

/**
 * Test token with local backend
 */
function testTokenLocally(token) {
  return new Promise((resolve, reject) => {
    console.log('\n🔍 Testing token with LOCAL backend...');
    console.log('   API:', LOCAL_API);
    
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/verify', // Assuming there's a verify endpoint, or use /api/sessions
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('   Status:', res.statusCode);
        console.log('   Response:', data);
        
        if (res.statusCode === 200 || res.statusCode === 401) {
          if (res.statusCode === 200) {
            console.log('✅ Token is VALID with local backend!');
          } else {
            console.log('❌ Token is INVALID or EXPIRED with local backend');
            console.log('   This might be because:');
            console.log('   1. Token was issued by production backend (different JWT_SECRET)');
            console.log('   2. Token has expired');
            console.log('   3. Local backend JWT_SECRET doesn\'t match production');
          }
          resolve({ success: res.statusCode === 200, statusCode: res.statusCode, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      console.error('   Make sure your local backend is running:');
      console.error('   cd fullstack/BE && npm run dev');
      reject(error);
    });

    req.end();
  });
}

/**
 * Test token with production backend (for comparison)
 */
function testTokenProduction(token) {
  return new Promise((resolve, reject) => {
    console.log('\n🔍 Testing token with PRODUCTION backend...');
    console.log('   API:', PROD_API);
    
    const options = {
      hostname: 'liveideconnect-production.up.railway.app',
      path: '/api/sessions',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('   Status:', res.statusCode);
        
        if (res.statusCode === 200) {
          console.log('✅ Token is VALID with production backend!');
          resolve({ success: true, statusCode: res.statusCode, data });
        } else {
          console.log('❌ Token is INVALID or EXPIRED with production backend');
          resolve({ success: false, statusCode: res.statusCode, data });
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });

    req.end();
  });
}

/**
 * Decode JWT token (without verification)
 */
function decodeToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload;
  } catch (error) {
    return null;
  }
}

// ============================================
// 🚀 MAIN TEST RUNNER
// ============================================

async function runTest() {
  console.log('🧪 Token Local Testing');
  console.log('='.repeat(50));
  console.log('');

  // Validate token
  if (!TOKEN || TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.error('❌ ERROR: Please set your TOKEN in the script');
    console.error('   Get it from: https://live-ide-connect.vercel.app');
    console.error('   Run in browser console: sessionStorage.getItem(\'auth_token\')');
    process.exit(1);
  }

  // Decode token to show info
  console.log('📋 Token Info:');
  const decoded = decodeToken(TOKEN);
  if (decoded) {
    console.log('   User ID:', decoded.userId || decoded.sub || 'N/A');
    console.log('   Email:', decoded.email || 'N/A');
    console.log('   Role:', decoded.role || 'N/A');
    if (decoded.exp) {
      const expDate = new Date(decoded.exp * 1000);
      const now = new Date();
      const isExpired = expDate < now;
      console.log('   Expires:', expDate.toISOString(), isExpired ? '(EXPIRED)' : '(Valid)');
    }
  } else {
    console.log('   ⚠️  Could not decode token');
  }

  // Test with production first
  try {
    await testTokenProduction(TOKEN);
  } catch (error) {
    console.error('❌ Production test failed:', error.message);
  }

  // Test with local backend
  try {
    await testTokenLocally(TOKEN);
  } catch (error) {
    console.error('❌ Local test failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure local backend is running: cd fullstack/BE && npm run dev');
    console.error('   2. Check if backend is listening on port 4000');
    console.error('   3. Verify JWT_SECRET matches between local and production');
  }

  console.log('\n📝 Notes:');
  console.log('   - Production tokens won\'t work with local backend if JWT_SECRET differs');
  console.log('   - You need to login through local frontend to get a local token');
  console.log('   - Or set the same JWT_SECRET in both environments');
}

// Run the test
runTest().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

