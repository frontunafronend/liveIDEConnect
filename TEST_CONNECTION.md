# 🧪 Testing Cursor IDE Connection

## Quick Test Guide

### Step 1: Install Dependencies

```bash
npm install ws
```

Or if you don't have Node.js installed, you can test directly in your browser console (see Browser Test below).

### Step 2: Get Your Credentials

1. **Get Your Token:**
   - Go to: https://live-ide-connect.vercel.app
   - Log in
   - Open browser DevTools (F12) → Console
   - Run: `sessionStorage.getItem('auth_token')`
   - Copy the token (long JWT string)

2. **Get/Create a Session:**
   - Option A: Go to https://live-ide-connect.vercel.app/sessions
   - Click "+ New Session"
   - Copy the Session ID from the URL (e.g., `/chat/abc-123` → `abc-123`)
   - Option B: The test script can auto-create a session for you

### Step 3: Run the Test Script

1. Open `test-cursor-connection.js` in a text editor
2. Replace `YOUR_JWT_TOKEN_HERE` with your actual token
3. (Optional) Replace `YOUR_SESSION_ID_HERE` with a session ID, or leave it empty to auto-create
4. Run:
   ```bash
   node test-cursor-connection.js
   ```

### Expected Output

If successful, you should see:
```
🧪 LiveIDEConnect - Cursor IDE Connection Test
==================================================

✅ Session created successfully! (if auto-creating)
   ID: abc-123-def-456
   Name: Cursor IDE Test Session

🔌 Connecting to WebSocket...
   URL: wss://liveideconnect-production.up.railway.app/ws?sessionId=...
   Session ID: abc-123-def-456
✅ WebSocket connected successfully!
📤 Sending test message...
   Message sent: Hello from Cursor IDE! This is a test connection.

📨 Received message:
   Type: agent_message
   From: client
   Content: [response content]
   Timestamp: 2025-11-08T...

✅ Test completed successfully!
   ✓ Connection established
   ✓ Message sent
   ✓ Message received

🎉 All tests passed! Your Cursor IDE can connect to LiveIDEConnect.
```

## Browser Console Test (No Node.js Required)

You can also test directly in your browser:

1. Go to: https://live-ide-connect.vercel.app
2. Open DevTools (F12) → Console
3. Paste and run:

```javascript
// Get your token and session ID
const token = sessionStorage.getItem('auth_token');
const sessionId = window.location.pathname.split('/chat/')[1] || prompt('Enter Session ID:');

if (!token || !sessionId) {
  console.error('❌ Missing token or session ID');
} else {
  // Connect WebSocket
  const ws = new WebSocket(`wss://liveideconnect-production.up.railway.app/ws?sessionId=${sessionId}&token=${token}`);
  
  ws.onopen = () => {
    console.log('✅ Connected!');
    ws.send(JSON.stringify({
      type: 'agent_message',
      from: 'ide',
      content: 'Test from browser console',
      sessionId: sessionId
    }));
  };
  
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log('📨 Received:', msg);
  };
  
  ws.onerror = (error) => {
    console.error('❌ Error:', error);
  };
  
  ws.onclose = () => {
    console.log('🔌 Disconnected');
  };
}
```

## Troubleshooting

### ❌ "Invalid or expired token"
- Your token may have expired
- Get a new token: `sessionStorage.getItem('auth_token')` in browser console
- Make sure you're logged in

### ❌ "Session not found"
- The session ID doesn't exist
- Create a new session via the web UI
- Make sure the session belongs to your user

### ❌ "Connection timeout"
- Check your internet connection
- Verify the backend is running: https://liveideconnect-production.up.railway.app/health
- Check if there's a firewall blocking WebSocket connections

### ❌ "Module not found: ws"
- Install dependencies: `npm install ws`
- Make sure you're in the project directory

## Next Steps

Once the test passes:
1. ✅ WebSocket connection works
2. ✅ You can send/receive messages
3. ✅ Ready to integrate with Cursor IDE extension

Use the Session ID and Token in your Cursor IDE extension code!

