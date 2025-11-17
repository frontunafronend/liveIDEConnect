# How to Reload the Extension

## ✅ Compilation Complete!

The TypeScript code has been compiled successfully. Now you need to reload the extension in Cursor.

## 🔄 Reload Options

### Option 1: Reload Window (Easiest)
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type: `Developer: Reload Window`
3. Press Enter
4. Extension will reload with new changes

### Option 2: Keyboard Shortcut
- Press `Ctrl+R` (or `Cmd+R` on Mac)
- This reloads the window

### Option 3: Restart Cursor
- Close and reopen Cursor completely
- Extension will load with new changes

## ✅ Verify Changes

After reloading, you should see:

1. **Chat Participant Registered**
   - Check output channel: "LiveIDEConnect" 
   - Look for: "✅ Chat participant registered successfully"

2. **New Features Available**
   - When you send a message, you'll see: "Also send to Cursor chat?"
   - You can use `/liveideconnect` or `/latest` in Cursor chat
   - You can use `@liveideconnect_message` variable in chat

## 🧪 Test It

1. **Send a message** from the custom panel or command palette
2. **Look for notification**: "Message sent to web app. Also send to Cursor chat?"
3. **Choose "Send to Cursor Chat"** to test the new feature

## 📝 Note

If you're developing the extension:
- Use `npm run watch` to auto-compile on changes
- Then reload window to see updates

## 🔍 Troubleshooting

If changes don't appear:
1. Make sure compilation succeeded (no errors)
2. Check `out/extension.js` was updated (check file timestamp)
3. Reload window completely
4. Check output channel for errors

