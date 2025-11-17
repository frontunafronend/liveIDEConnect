# LiveIDEConnect Cursor Extension

This extension connects Cursor IDE to the LiveIDEConnect web app, allowing bidirectional communication between the web chat and Cursor IDE.

## Features

- 🔌 WebSocket connection to LiveIDEConnect backend
- 💬 Receive messages from web app in Cursor IDE
- 📤 Send messages from Cursor IDE to web app
- 🔄 Auto-reconnect on connection loss
- 📝 Output channel for debugging

## Installation

1. Copy this extension folder to your Cursor extensions directory
2. Run `npm install` in the extension directory
3. Run `npm run compile` to build the extension
4. Reload Cursor IDE

## Configuration

Add to your Cursor settings (`.vscode/settings.json` or User Settings):

```json
{
  "liveideconnect.token": "YOUR_JWT_TOKEN_HERE",
  "liveideconnect.sessionId": "YOUR_SESSION_ID_HERE",
  "liveideconnect.apiBase": "http://localhost:4000"
}
```

### Getting Your Token and Session ID

1. **Token**: Log in to the web app and get it from browser console:
   ```javascript
   sessionStorage.getItem('auth_token')
   ```

2. **Session ID**: Create a session in the web app and copy the ID from the URL

## Commands

- `LiveIDEConnect: Connect` - Connect to LiveIDEConnect
- `LiveIDEConnect: Disconnect` - Disconnect from LiveIDEConnect
- `LiveIDEConnect: Send Message` - Send a message to the web app

## How It Works

1. Extension connects to WebSocket on startup (if configured)
2. When you send a message in Cursor chat, it's sent to the web app
3. When someone sends a message from the web app, it appears in Cursor IDE
4. All activity is logged to the "LiveIDEConnect" output channel

## Development

```bash
npm install
npm run compile
npm run watch  # Watch mode for development
```

## Notes

- The extension uses VS Code's Chat API (available in VS Code 1.85+)
- If Chat API is not available, messages will appear as notifications
- Check the Output channel ("LiveIDEConnect") for connection status and debugging

