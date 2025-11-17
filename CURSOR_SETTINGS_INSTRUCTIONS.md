# 🔧 Cursor IDE Extension Settings

## Quick Setup

1. **Open Cursor Settings:**
   - Press `F1` (or `Ctrl+Shift+P`)
   - Type: `Preferences: Open User Settings (JSON)`
   - Press Enter

2. **Add these settings to your settings.json file:**

```json
{
  "liveideconnect.token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjMWY3MDlhNy02MzgyLTQxNTQtYTczOC0xZTEzZTEyYWRlYmIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc2MzM4MDIyNywiZXhwIjoxNzYzOTg1MDI3fQ.9GQkB1BR_KBSXrGIhUAeyZgqvDtyFww0DEa1kfFkFn0",
  "liveideconnect.sessionId": "6c80089c-74b1-425a-b2cf-dfd8ff017037",
  "liveideconnect.apiBase": "http://localhost:4000"
}
```

3. **Save the file** (Ctrl+S)

4. **Reload Cursor IDE** or press `F1` → `Developer: Reload Window`

5. **Check connection:**
   - Press `F1` → `LiveIDEConnect: Connect`
   - Or check the Output panel: View → Output → Select "LiveIDEConnect"
   - You should see: `✅ Connected to LiveIDEConnect!`

## Your Current Values

- **Token**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjMWY3MDlhNy02MzgyLTQxNTQtYTczOC0xZTEzZTEyYWRlYmIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc2MzM4MDIyNywiZXhwIjoxNzYzOTg1MDI3fQ.9GQkB1BR_KBSXrGIhUAeyZgqvDtyFww0DEa1kfFkFn0`
- **Session ID**: `6c80089c-74b1-425a-b2cf-dfd8ff017037`
- **API Base**: `http://localhost:4000`

## Testing

1. **Send a message from web app** → Should appear in Cursor chat
2. **Send a message from Cursor** → Should appear in web app
3. **Check Output panel** → See all connection logs

## Troubleshooting

- **"Please set token and sessionId"**: Make sure settings are saved and Cursor is reloaded
- **Connection fails**: Check that backend is running on `localhost:4000`
- **Messages not appearing**: Check the Output panel for errors

