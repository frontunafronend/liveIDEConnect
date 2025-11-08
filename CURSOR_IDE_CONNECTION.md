# 🔌 Connecting Cursor IDE to LiveIDEConnect

## Quick Connection Guide

### Step 1: Get Your Authentication Token

1. Log in to the web app: `https://live-ide-connect.vercel.app`
2. Open browser DevTools (F12) → Console
3. Run this to get your token:
   ```javascript
   JSON.parse(localStorage.getItem('user') || '{}').token || sessionStorage.getItem('token')
   ```
4. Copy the token (it's a long JWT string)

### Step 2: Create a Session

**Option A: Via Web UI**
1. Go to `https://live-ide-connect.vercel.app/sessions`
2. Click "New Session" or create one
3. Copy the Session ID from the URL or session card

**Option B: Via API**
```bash
curl -X POST https://liveideconnect-production.up.railway.app/api/sessions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"name": "Cursor IDE - My Project", "status": "online"}'
```

### Step 3: Connect WebSocket

Use these connection details:

- **WebSocket URL**: `wss://liveideconnect-production.up.railway.app/ws`
- **Query Parameters**: 
  - `sessionId` - Your session ID
  - `token` - Your JWT token

**Full URL Format:**
```
wss://liveideconnect-production.up.railway.app/ws?sessionId=YOUR_SESSION_ID&token=YOUR_TOKEN
```

## 📝 Cursor Extension Example

Create a Cursor extension that connects to the WebSocket:

```typescript
import * as vscode from 'vscode';
import WebSocket from 'ws';

let ws: WebSocket | null = null;

export function activate(context: vscode.ExtensionContext) {
  // Get token from settings
  const config = vscode.workspace.getConfiguration('liveideconnect');
  const token = config.get<string>('token');
  const sessionId = config.get<string>('sessionId');
  const apiBase = config.get<string>('apiBase', 'https://liveideconnect-production.up.railway.app');

  if (!token || !sessionId) {
    vscode.window.showErrorMessage('LiveIDEConnect: Please set token and sessionId in settings');
    return;
  }

  // Connect to WebSocket
  const wsUrl = `${apiBase.replace('https://', 'wss://').replace('http://', 'ws://')}/ws?sessionId=${sessionId}&token=${token}`;
  
  ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    vscode.window.showInformationMessage('LiveIDEConnect: Connected!');
  });

  ws.on('message', (data: Buffer) => {
    const message = JSON.parse(data.toString());
    
    // Handle incoming messages
    if (message.type === 'agent_message' && message.from === 'ide') {
      vscode.window.showInformationMessage(`AI: ${message.content}`);
    }
  });

  ws.on('error', (error) => {
    vscode.window.showErrorMessage(`LiveIDEConnect Error: ${error.message}`);
  });

  // Send message command
  const sendMessage = vscode.commands.registerCommand('liveideconnect.sendMessage', async () => {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter your message'
    });

    if (input && ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'agent_message',
        from: 'client',
        content: input
      }));
    }
  });

  context.subscriptions.push(sendMessage);
}

export function deactivate() {
  if (ws) {
    ws.close();
  }
}
```

## 🔧 Cursor Settings (settings.json)

Add to your Cursor settings:

```json
{
  "liveideconnect.token": "YOUR_JWT_TOKEN_HERE",
  "liveideconnect.sessionId": "YOUR_SESSION_ID_HERE",
  "liveideconnect.apiBase": "https://liveideconnect-production.up.railway.app"
}
```

## 🚀 Quick Test Script

Create a simple Node.js script to test the connection:

```javascript
// test-connection.js
const WebSocket = require('ws');

const SESSION_ID = 'YOUR_SESSION_ID';
const TOKEN = 'YOUR_TOKEN';
const WS_URL = `wss://liveideconnect-production.up.railway.app/ws?sessionId=${SESSION_ID}&token=${TOKEN}`;

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ Connected to LiveIDEConnect!');
  
  // Send a test message
  ws.send(JSON.stringify({
    type: 'agent_message',
    from: 'client',
    content: 'Hello from Cursor IDE!'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📨 Received:', message);
});

ws.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

ws.on('close', () => {
  console.log('🔌 Disconnected');
});
```

Run it:
```bash
node test-connection.js
```

## 📋 Connection Checklist

- [ ] Logged in to web app
- [ ] Got JWT token
- [ ] Created a session
- [ ] Got session ID
- [ ] WebSocket URL is correct
- [ ] Token and sessionId are valid

## 🎯 Next Steps

1. **Create Cursor Extension**: Build a full extension with UI
2. **Auto-Connect**: Auto-connect when Cursor opens
3. **Code Context**: Send code context to AI
4. **AI Responses**: Display AI responses in Cursor

## 🔗 Your Live URLs

- **Frontend**: https://live-ide-connect.vercel.app
- **Backend API**: https://liveideconnect-production.up.railway.app/api
- **WebSocket**: wss://liveideconnect-production.up.railway.app/ws

