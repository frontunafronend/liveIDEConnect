import * as vscode from 'vscode';
import WebSocket from 'ws';
import { randomUUID } from 'crypto';

let ws: WebSocket | null = null;
let outputChannel: vscode.OutputChannel | null = null;
let statusBarItem: vscode.StatusBarItem | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let chatPanel: vscode.WebviewPanel | null = null;
let messageQueue: LiveIdeMessage[] = [];
let pendingChatMessages: LiveIdeMessage[] = []; // Messages waiting to be shown (kept for backward compatibility)
let tabId: string = randomUUID(); // Unique ID for this Cursor tab/window
let chatParticipant: any; // Chat participant for official API integration (using any since types may not be fully available)
let latestWebAppMessage: LiveIdeMessage | null = null; // Store latest message for chat participant

interface LiveIdeMessage {
  type: string;
  sessionId: string;
  from: 'client' | 'ide';
  content: string;
  ts: string;
}

function getConfig(): { token: string; sessionId: string; apiBase: string; autoSendToCursorChat: boolean } {
  const config = vscode.workspace.getConfiguration('liveideconnect');
  return {
    token: config.get<string>('token') || '',
    sessionId: config.get<string>('sessionId') || '',
    apiBase: config.get<string>('apiBase', 'http://localhost:4000'),
    autoSendToCursorChat: config.get<boolean>('autoSendToCursorChat', true)
  };
}

function getSessionId(): string {
  return getConfig().sessionId;
}

function connectWebSocket() {
  const { token, sessionId, apiBase } = getConfig();

  if (!token || !sessionId) {
    vscode.window.showErrorMessage(
      'LiveIDEConnect: Please set token and sessionId in settings'
    );
    return;
  }

  // Check for placeholder values
  if (token.includes('your-token') || token.includes('example') || token.length < 20) {
    vscode.window.showErrorMessage(
      'LiveIDEConnect: Invalid token detected. Please set a valid token in settings.',
      'Open Settings'
    ).then(selection => {
      if (selection === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'liveideconnect.token');
      }
    });
    return;
  }

  if (sessionId.includes('your-session') || sessionId.includes('example') || sessionId.length < 10) {
    vscode.window.showErrorMessage(
      'LiveIDEConnect: Invalid sessionId detected. Please set a valid sessionId in settings.',
      'Open Settings'
    ).then(selection => {
      if (selection === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'liveideconnect.sessionId');
      }
    });
    return;
  }

  // Close existing connection
  if (ws) {
    ws.close();
    ws = null;
  }

  // Include tabId in connection to enable per-tab isolation
  const wsUrl = `${apiBase.replace('https://', 'wss://').replace('http://', 'ws://')}/ws?sessionId=${sessionId}&token=${token}&tabId=${tabId}`;
  
  outputChannel?.appendLine(`🔌 Connecting to: ${wsUrl.replace(/token=[^&]+/, 'token=***')}`);
  outputChannel?.appendLine(`   Session ID: ${sessionId}`);
  outputChannel?.appendLine(`   Tab ID: ${tabId}`);
  updateStatusBar('connecting');
  
  ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    outputChannel?.appendLine('✅ Connected to LiveIDEConnect!');
    outputChannel?.appendLine(`   Session ID: ${sessionId}`);
    outputChannel?.appendLine(`   WebSocket URL: ${wsUrl.replace(/token=[^&]+/, 'token=***')}`);
    vscode.window.showInformationMessage('LiveIDEConnect: Connected!');
    updateStatusBar('connected');
    reconnectAttempts = 0; // Reset on successful connection
    
    // Clear any pending reconnection
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  });

  ws.on('message', async (data: Buffer) => {
    try {
      const message: LiveIdeMessage = JSON.parse(data.toString());
      outputChannel?.appendLine(`📨 Received: ${message.content} (from: ${message.from}, type: ${message.type})`);
      
      // Handle all message types
      if (message.type === 'status') {
        // Status messages (connection updates, etc.)
        outputChannel?.appendLine(`ℹ️  Status: ${message.content}`);
        if (chatPanel) {
          chatPanel.webview.postMessage({
            command: 'status',
            message: message
          });
        }
      } else if (message.type === 'agent_message') {
        // Regular chat messages
        outputChannel?.appendLine(`💬 Message received: "${message.content}" (from: ${message.from})`);
        
        // Add to message queue
        messageQueue.push(message);
        
        // Handle messages from web app with user consent
        if (message.from === 'client') {
          // Show notification and get user consent (handled in addMessageToCursorChat)
          // This function will show the custom panel as primary interface
          await addMessageToCursorChat(message);
        } else {
          // Messages from IDE - just show in custom panel
          showChatPanel();
          setTimeout(() => {
            if (chatPanel) {
              chatPanel.webview.postMessage({
                command: 'newMessage',
                message: message
              });
            } else {
              setTimeout(() => {
                if (chatPanel) {
                  chatPanel.webview.postMessage({
                    command: 'newMessage',
                    message: message
                  });
                }
              }, 100);
            }
          }, 50);
        }
      } else {
        // Unknown message type - still log it
        outputChannel?.appendLine(`📦 Unknown message type: ${message.type}`);
        if (chatPanel) {
          chatPanel.webview.postMessage({
            command: 'newMessage',
            message: message
          });
        }
      }
    } catch (error) {
      outputChannel?.appendLine(`❌ Error parsing message: ${error}`);
    }
  });

  ws.on('error', (error: Error) => {
    const errorMsg = error?.message || String(error);
    outputChannel?.appendLine(`❌ WebSocket error: ${errorMsg}`);
    outputChannel?.appendLine(`   Error stack: ${error?.stack || 'No stack'}`);
    outputChannel?.appendLine(`   Connection URL: ${wsUrl.replace(/token=[^&]+/, 'token=***')}`);
    outputChannel?.appendLine(`   Session ID: ${sessionId}`);
    outputChannel?.appendLine(`   Tab ID: ${tabId}`);
    updateStatusBar('error');
    vscode.window.showErrorMessage(
      `LiveIDEConnect Error: ${errorMsg}. Check the "LiveIDEConnect" output channel for details.`,
      'Open Output Channel'
    ).then(selection => {
      if (selection === 'Open Output Channel') {
        outputChannel?.show();
      }
    });
  });

  ws.on('close', (code: number, reason: Buffer) => {
    const reasonStr = reason ? reason.toString() : 'No reason';
    outputChannel?.appendLine(`🔌 WebSocket closed. Code: ${code}, Reason: ${reasonStr}`);
    outputChannel?.appendLine(`   Session ID: ${sessionId}`);
    outputChannel?.appendLine(`   Tab ID: ${tabId}`);
    updateStatusBar('disconnected');
    
    // Don't reconnect on authentication/authorization errors
    // 1008 = Policy violation (invalid/expired token, wrong session, etc.)
    // 1002 = Protocol error (often auth-related)
    // 1003 = Unsupported data (can be auth-related)
    const isAuthError = code === 1008 || code === 1002 || code === 1003;
    
    if (isAuthError) {
      outputChannel?.appendLine(`❌ Authentication error (Code: ${code}). Please check your token and sessionId in settings.`);
      outputChannel?.appendLine(`   Current token: ${token.substring(0, 20)}... (length: ${token.length})`);
      outputChannel?.appendLine(`   Current sessionId: ${sessionId}`);
      vscode.window.showErrorMessage(
        `LiveIDEConnect: Authentication failed (Code: ${code}). ` +
        `Please verify your token and sessionId in settings. ` +
        `Reason: ${reasonStr}`,
        'Open Settings',
        'Open Output Channel'
      ).then(selection => {
        if (selection === 'Open Settings') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'liveideconnect');
        } else if (selection === 'Open Output Channel') {
          outputChannel?.show();
        }
      });
      // Clear reconnect attempts to prevent reconnecting on auth errors
      reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
      return;
    }
    
    // Only show notification if it wasn't a manual disconnect
    if (code !== 1000) { // 1000 = normal closure
      vscode.window.showInformationMessage(`LiveIDEConnect: Disconnected (Code: ${code})`);
    }
    
    // Attempt to reconnect if not manually closed and not an auth error
    if (code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000); // Exponential backoff
      outputChannel?.appendLine(`🔄 Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      
      reconnectTimeout = setTimeout(() => {
        connectWebSocket();
      }, delay);
    } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      outputChannel?.appendLine('❌ Max reconnection attempts reached. Please reconnect manually.');
      vscode.window.showErrorMessage('LiveIDEConnect: Max reconnection attempts reached. Please reconnect manually.');
    }
  });
}

/**
 * Opens Cursor chat using documented command
 * Returns true if chat was opened successfully
 */
async function openCursorChat(): Promise<boolean> {
  try {
    await vscode.commands.executeCommand('workbench.action.chat.open');
    outputChannel?.appendLine('✅ Cursor chat opened');
    return true;
  } catch (error: any) {
    outputChannel?.appendLine(`⚠️ Failed to open Cursor chat: ${error.message || error}`);
    return false;
  }
}

/**
 * Sends a message to Cursor's native chat using documented commands
 * Uses ONLY documented, public APIs to comply with Cursor's restrictions
 * Since Chat API doesn't support injecting user messages, we use type command with user consent
 * Returns true if message was sent successfully
 */
async function sendMessageToCursorChat(messageContent: string): Promise<boolean> {
  try {
    outputChannel?.appendLine('💬 Attempting to send message to Cursor chat...');
    
    // Step 1: Open Cursor chat
    outputChannel?.appendLine('📂 Opening Cursor chat...');
    try {
      await vscode.commands.executeCommand('workbench.action.chat.open');
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for chat to open
      outputChannel?.appendLine('✅ Cursor chat opened');
    } catch (error: any) {
      outputChannel?.appendLine(`⚠️ Failed to open chat: ${error.message || error}`);
      return false;
    }
    
    // Step 2: Focus chat input
    outputChannel?.appendLine('🎯 Focusing chat input...');
    try {
      await vscode.commands.executeCommand('workbench.action.chat.focus');
      await new Promise(resolve => setTimeout(resolve, 300)); // Wait for focus
      outputChannel?.appendLine('✅ Chat input focused');
    } catch (error: any) {
      outputChannel?.appendLine(`⚠️ Failed to focus chat: ${error.message || error}`);
      // Continue anyway - chat might still be usable
    }
    
    // Step 3: Type the message using the documented 'type' command
    // This is a documented VS Code command and is compliant when used with user consent
    outputChannel?.appendLine('⌨️ Typing message into chat input...');
    try {
      await vscode.commands.executeCommand('type', { text: messageContent });
      await new Promise(resolve => setTimeout(resolve, 200)); // Wait for typing to complete
      outputChannel?.appendLine('✅ Message typed into chat input');
      
      // Step 4: Ask user if they want to submit
      const submitChoice = await vscode.window.showInformationMessage(
        `Message typed into Cursor chat. Submit it?`,
        'Submit',
        'Skip'
      );
      
      if (submitChoice === 'Submit') {
        try {
          await vscode.commands.executeCommand('workbench.action.chat.submit');
          outputChannel?.appendLine('✅ Message submitted to Cursor chat');
          return true;
        } catch (error: any) {
          outputChannel?.appendLine(`⚠️ Failed to submit: ${error.message || error}`);
          outputChannel?.appendLine('ℹ️ Message is in chat input - you can press Enter manually');
          vscode.window.showInformationMessage('Message is ready in chat input. Press Enter to send.');
          return true; // Still success - message is there
        }
      } else {
        outputChannel?.appendLine('ℹ️ User chose not to submit - message is in chat input');
        vscode.window.showInformationMessage('Message is ready in chat input. Press Enter when ready.');
        return true; // Still success - message is there
      }
    } catch (error: any) {
      outputChannel?.appendLine(`⚠️ Failed to type message: ${error.message || error}`);
      
      // Fallback: Copy to clipboard
      outputChannel?.appendLine('📋 Falling back to clipboard method...');
      await vscode.env.clipboard.writeText(messageContent);
      vscode.window.showInformationMessage('Message copied to clipboard. Paste into Cursor chat and press Enter.');
      return true;
    }
  } catch (error: any) {
    outputChannel?.appendLine(`❌ Error sending message to Cursor chat: ${error.message || error}`);
    return false;
  }
}

/**
 * Handles sending a message with option to also send to Cursor chat
 * Automatically sends if autoSendToCursorChat is enabled, otherwise asks for confirmation
 * Note: Message is already sent to web app before this function is called
 */
async function sendMessageWithCursorIntegration(messageContent: string): Promise<void> {
  const { autoSendToCursorChat } = getConfig();
  
  if (autoSendToCursorChat) {
    // Auto-send to Cursor chat (default behavior)
    outputChannel?.appendLine('🚀 Auto-sending to Cursor chat (autoSendToCursorChat enabled)...');
    try {
      await sendMessageToCursorChat(messageContent);
      outputChannel?.appendLine('✅ Message automatically sent to Cursor chat');
    } catch (error: any) {
      outputChannel?.appendLine(`⚠️ Failed to auto-send to Cursor chat: ${error.message || error}`);
      // Show notification on error so user knows
      vscode.window.showWarningMessage('Failed to send message to Cursor chat. Check output channel for details.');
    }
  } else {
    // Ask for confirmation (manual mode)
    outputChannel?.appendLine('💬 Showing Cursor chat integration notification (manual mode)...');
    
    const choice = await vscode.window.showInformationMessage(
      `💬 Message sent to web app. Also send to Cursor chat?`,
      'Send to Cursor Chat',
      'Copy to Clipboard',
      'Skip'
    );
    
    outputChannel?.appendLine(`📋 User choice: ${choice || 'none (dismissed)'}`);
    
    switch (choice) {
      case 'Send to Cursor Chat':
        outputChannel?.appendLine('✅ User chose to send to Cursor chat');
        await sendMessageToCursorChat(messageContent);
        break;
        
      case 'Copy to Clipboard':
        outputChannel?.appendLine('✅ User chose to copy to clipboard');
        await vscode.env.clipboard.writeText(messageContent);
        vscode.window.showInformationMessage('Message copied to clipboard. Paste into Cursor chat if needed.');
        break;
        
      case 'Skip':
        outputChannel?.appendLine('ℹ️ User skipped Cursor chat integration');
        break;
        
      default:
        outputChannel?.appendLine('ℹ️ Notification dismissed or no choice made');
        break;
    }
  }
}

/**
 * Registers a Chat Participant using the official VS Code Chat API (1.85+)
 * This allows users to interact with web app messages via slash commands
 */
function registerChatParticipant(context: vscode.ExtensionContext) {
  // Check if Chat API is available (VS Code 1.85+)
  if (!vscode.chat) {
    outputChannel?.appendLine('ℹ️ Chat API not available (requires VS Code 1.85+)');
    return;
  }

  try {
    // Register as a chat participant - this is the OFFICIAL API
    // Using type assertion since types may not be fully available yet
    const chatApi = vscode.chat as any;
    
    chatParticipant = chatApi.createChatParticipant('liveideconnect', {
      name: 'LiveIDEConnect',
      description: 'Access messages from LiveIDEConnect web app',
      commandProvider: {
        provideCommands: (token: vscode.CancellationToken) => {
          return [
            {
              name: 'latest',
              description: 'Show the latest message from web app'
            },
            {
              name: 'show',
              description: 'Show recent messages from web app'
            }
          ];
        }
      }
    }, async (request: any, context: any, stream: any, token: vscode.CancellationToken) => {
      outputChannel?.appendLine(`💬 Chat participant invoked: "${request.prompt}"`);
      
      // Handle different slash commands
      if (request.prompt.startsWith('/latest')) {
        // Show latest message from web app
        if (latestWebAppMessage) {
          stream.progress('📨 Latest message from web app:');
          stream.markdown(latestWebAppMessage.content);
          stream.markdown(`\n\n*Received at: ${new Date(latestWebAppMessage.ts).toLocaleString()}*`);
        } else {
          stream.markdown('No messages received from web app yet.');
        }
        return;
      }
      
      if (request.prompt.startsWith('/show')) {
        // Show all recent messages
        const recentMessages = messageQueue.filter(m => m.from === 'client').slice(-5);
        if (recentMessages.length > 0) {
          stream.progress('📨 Recent messages from web app:');
          recentMessages.forEach((msg, index) => {
            stream.markdown(`\n### Message ${index + 1}`);
            stream.markdown(msg.content);
            stream.markdown(`*${new Date(msg.ts).toLocaleString()}*`);
          });
        } else {
          stream.markdown('No messages received from web app yet.');
        }
        return;
      }
      
      // Default: Show help
      stream.markdown('## LiveIDEConnect Chat Commands\n\n');
      stream.markdown('- `/latest` - Show the latest message from web app\n');
      stream.markdown('- `/show` - Show recent messages from web app\n');
      stream.markdown('\n*Tip: Messages from web app are automatically shown in the custom panel.*');
    });
    
    context.subscriptions.push(chatParticipant);
    outputChannel?.appendLine('✅ Chat participant registered successfully');
  } catch (error: any) {
    outputChannel?.appendLine(`⚠️ Failed to register chat participant: ${error.message || error}`);
  }
}

/**
 * Registers Chat Variables using the official VS Code Chat API (1.85+)
 * This allows messages to be accessible as variables in chat
 */
function registerChatVariables(context: vscode.ExtensionContext) {
  if (!vscode.chat) {
    return;
  }

  try {
    // Register chat variables - OFFICIAL API
    // Using type assertion since types may not be fully available yet
    const chatApi = vscode.chat as any;
    
    if (chatApi.createChatVariable) {
      const chatVariable = chatApi.createChatVariable(
        'liveideconnect_message',
        'Latest message from LiveIDEConnect web app',
        async (request: any, argument: any, token: vscode.CancellationToken) => {
          if (latestWebAppMessage) {
            return latestWebAppMessage.content;
          }
          return 'No message received yet.';
        }
      );
      
      context.subscriptions.push(chatVariable);
      outputChannel?.appendLine('✅ Chat variable registered successfully');
    } else {
      outputChannel?.appendLine('ℹ️ Chat variable API not available in this version');
    }
  } catch (error: any) {
    outputChannel?.appendLine(`⚠️ Failed to register chat variable: ${error.message || error}`);
  }
}

/**
 * Handles incoming messages from web app with user consent
 * Uses ONLY documented, public APIs to comply with Cursor's restrictions
 * Custom panel is the primary interface; Cursor chat integration requires user consent
 * Also stores message for chat participant/variable access
 */
async function addMessageToCursorChat(message: LiveIdeMessage): Promise<boolean> {
  // Store latest message for chat participant/variable access
  latestWebAppMessage = message;
  try {
    outputChannel?.appendLine(`💬 New message received: "${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}"`);
    
    const preview = message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '');
    
    // Show notification with user options - REQUIRES USER CONSENT
    const choice = await vscode.window.showInformationMessage(
      `💬 New message from web app: ${preview}`,
      'Open Cursor Chat',
      'Copy to Clipboard',
      'View in Panel'
    );
    
    switch (choice) {
      case 'Open Cursor Chat':
        // User explicitly requested to open Cursor chat
        outputChannel?.appendLine('✅ User chose to open Cursor chat');
        try {
          // Open chat using documented command
          await vscode.commands.executeCommand('workbench.action.chat.open');
          outputChannel?.appendLine('✅ Cursor chat opened');
          
          // Show message in notification so user can copy/paste manually
          // We don't auto-type or auto-submit - user must do it manually
          vscode.window.showInformationMessage(
            `Message ready to paste: ${preview}`,
            'Copy Message'
          ).then(copyChoice => {
            if (copyChoice === 'Copy Message') {
              // User explicitly requested clipboard copy
              vscode.env.clipboard.writeText(message.content).then(() => {
                vscode.window.showInformationMessage('Message copied to clipboard. Paste into Cursor chat.');
                outputChannel?.appendLine('✅ Message copied to clipboard (user requested)');
              });
            }
          });
        } catch (error: any) {
          outputChannel?.appendLine(`⚠️ Failed to open Cursor chat: ${error.message || error}`);
          // Fallback to custom panel
          showChatPanel();
          setTimeout(() => {
            if (chatPanel) {
              chatPanel.webview.postMessage({
                command: 'newMessage',
                message: message
              });
            }
          }, 50);
        }
        return false; // Always use custom panel as primary
        
      case 'Copy to Clipboard':
        // User explicitly requested clipboard copy
        outputChannel?.appendLine('✅ User chose to copy message to clipboard');
        try {
          await vscode.env.clipboard.writeText(message.content);
          vscode.window.showInformationMessage('Message copied to clipboard. Paste into Cursor chat.');
          outputChannel?.appendLine('✅ Message copied to clipboard (user requested)');
        } catch (error: any) {
          outputChannel?.appendLine(`⚠️ Failed to copy to clipboard: ${error.message || error}`);
          vscode.window.showErrorMessage('Failed to copy message to clipboard.');
        }
        return false;
        
      case 'View in Panel':
      default:
        // Default: Show in custom panel (safest option)
        outputChannel?.appendLine('✅ Showing message in custom panel');
        showChatPanel();
        setTimeout(() => {
          if (chatPanel) {
            chatPanel.webview.postMessage({
              command: 'newMessage',
              message: message
            });
          } else {
            // Retry if panel not ready
            setTimeout(() => {
              if (chatPanel) {
                chatPanel.webview.postMessage({
                  command: 'newMessage',
                  message: message
                });
              }
            }, 100);
          }
        }, 50);
        return false;
    }
  } catch (error: any) {
    outputChannel?.appendLine(`❌ Error handling message: ${error.message || error}`);
    // Fallback to custom panel on error
    showChatPanel();
    setTimeout(() => {
      if (chatPanel) {
        chatPanel.webview.postMessage({
          command: 'newMessage',
          message: message
        });
      }
    }, 50);
    return false;
  }
}

/**
 * Process pending chat messages - shows them in custom panel
 * Note: Since we use user consent, messages are shown immediately in custom panel
 * This function is kept for backward compatibility but is no longer needed
 */
async function processPendingChatMessages(): Promise<void> {
  if (pendingChatMessages.length === 0) {
    outputChannel?.appendLine('ℹ️ No pending messages');
    return;
  }

  outputChannel?.appendLine(`🔄 Processing ${pendingChatMessages.length} pending messages in custom panel...`);
  
  // Show all pending messages in custom panel
  showChatPanel();
  const messagesToProcess = [...pendingChatMessages];
  pendingChatMessages.length = 0; // Clear queue
  
  setTimeout(() => {
    messagesToProcess.forEach((message, index) => {
      setTimeout(() => {
        if (chatPanel) {
          chatPanel.webview.postMessage({
            command: 'newMessage',
            message: message
          });
        }
      }, index * 100); // Stagger messages slightly
    });
  }, 100);
  
  outputChannel?.appendLine(`✅ ${messagesToProcess.length} messages shown in custom panel`);
}

function showChatPanel() {
  const column = vscode.ViewColumn.Beside;
  
  if (chatPanel) {
    // Panel already exists, just reveal it
    chatPanel.reveal(column);
  } else {
    // Create new panel
    chatPanel = vscode.window.createWebviewPanel(
      'liveideconnectChat',
      'LiveIDEConnect Chat',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    
    // Set initial HTML content
    chatPanel.webview.html = getWebviewContent();
    
    // Handle messages from webview
    chatPanel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'sendMessage':
            if (ws && ws.readyState === WebSocket.OPEN) {
              const msg: LiveIdeMessage = {
                type: 'agent_message',
                sessionId: getSessionId(),
                from: 'ide',
                content: message.text,
                ts: new Date().toISOString()
              };
              
              // Add to message queue for persistence
              messageQueue.push(msg);
              
              // Optimistically display the message in the chat panel immediately
              if (chatPanel) {
                chatPanel.webview.postMessage({
                  command: 'newMessage',
                  message: msg
                });
              }
              
              // Send via WebSocket
              ws.send(JSON.stringify(msg));
              outputChannel?.appendLine(`📤 Sent to web app: ${message.text}`);
              
              // Offer to also send to Cursor chat (with user consent)
              // Use setTimeout to ensure notification appears after message is sent
              setTimeout(async () => {
                try {
                  await sendMessageWithCursorIntegration(message.text);
                } catch (error: any) {
                  outputChannel?.appendLine(`⚠️ Error in cursor integration: ${error.message || error}`);
                }
              }, 500);
            } else {
              vscode.window.showWarningMessage('Not connected. Please connect first.');
            }
            break;
        }
      },
      undefined,
      []
    );
    
    // Send all queued messages to the panel
    if (messageQueue.length > 0) {
      chatPanel.webview.postMessage({
        command: 'loadMessages',
        messages: messageQueue
      });
    }
    
    // Clean up when panel is closed
    chatPanel.onDidDispose(
      () => {
        chatPanel = null;
      },
      null,
      []
    );
  }
}

function getWebviewContent(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LiveIDEConnect Chat</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            margin: 0;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .messages {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 20px;
            padding: 10px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }
        .message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 4px;
            background-color: var(--vscode-input-background);
        }
        .message.client {
            border-left: 3px solid var(--vscode-textLink-foreground);
        }
        .message.ide {
            border-left: 3px solid var(--vscode-button-background);
        }
        .message-header {
            font-size: 12px;
            opacity: 0.7;
            margin-bottom: 5px;
        }
        .message-content {
            word-wrap: break-word;
        }
        .input-area {
            display: flex;
            gap: 10px;
        }
        input {
            flex: 1;
            padding: 10px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            font-family: var(--vscode-font-family);
        }
        button {
            padding: 10px 20px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            opacity: 0.5;
        }
    </style>
</head>
<body>
    <div class="messages" id="messages">
        <div class="empty-state">No messages yet. Send a message from the web app or type below.</div>
    </div>
    <div class="input-area">
        <input type="text" id="messageInput" placeholder="Type your message..." />
        <button id="sendButton">Send</button>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        
        function addMessage(message) {
            // Remove empty state if present
            const emptyState = messagesDiv.querySelector('.empty-state');
            if (emptyState) {
                emptyState.remove();
            }
            
            const messageDiv = document.createElement('div');
            
            // Handle different message types
            if (message.type === 'status') {
                messageDiv.className = 'message status';
                messageDiv.style.opacity = '0.7';
                messageDiv.style.fontStyle = 'italic';
            } else {
                messageDiv.className = 'message ' + message.from;
            }
            
            const header = document.createElement('div');
            header.className = 'message-header';
            const sender = message.type === 'status' ? 'System' : (message.from === 'client' ? 'Web App' : 'IDE');
            header.textContent = sender + ' • ' + new Date(message.ts).toLocaleTimeString();
            
            const content = document.createElement('div');
            content.className = 'message-content';
            content.textContent = message.content;
            
            messageDiv.appendChild(header);
            messageDiv.appendChild(content);
            messagesDiv.appendChild(messageDiv);
            
            // Scroll to bottom
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        function addStatus(statusText) {
            const statusDiv = document.createElement('div');
            statusDiv.className = 'message status';
            statusDiv.style.opacity = '0.7';
            statusDiv.style.fontStyle = 'italic';
            statusDiv.style.textAlign = 'center';
            statusDiv.style.padding = '10px';
            statusDiv.textContent = statusText;
            messagesDiv.appendChild(statusDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        function loadMessages(messages) {
            messages.forEach(msg => addMessage(msg));
        }
        
        function sendMessage() {
            const text = messageInput.value.trim();
            if (text) {
                vscode.postMessage({
                    command: 'sendMessage',
                    text: text
                });
                messageInput.value = '';
            }
        }
        
        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'newMessage':
                    addMessage(message.message);
                    break;
                case 'loadMessages':
                    loadMessages(message.messages);
                    break;
                case 'status':
                    addStatus(message.message.content);
                    break;
            }
        });
    </script>
</body>
</html>`;
}

function updateStatusBar(status: 'connected' | 'disconnected' | 'connecting' | 'error') {
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'liveideconnect.connect';
    statusBarItem.tooltip = 'Click to connect to LiveIDEConnect';
  }
  
  switch (status) {
    case 'connected':
      statusBarItem.text = '$(plug) LiveIDEConnect';
      statusBarItem.backgroundColor = undefined;
      statusBarItem.color = undefined;
      statusBarItem.tooltip = 'LiveIDEConnect: Connected';
      break;
    case 'disconnected':
      statusBarItem.text = '$(plug) LiveIDEConnect (Disconnected)';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      statusBarItem.tooltip = 'LiveIDEConnect: Disconnected - Click to connect';
      break;
    case 'connecting':
      statusBarItem.text = '$(sync~spin) LiveIDEConnect (Connecting...)';
      statusBarItem.backgroundColor = undefined;
      statusBarItem.tooltip = 'LiveIDEConnect: Connecting...';
      break;
    case 'error':
      statusBarItem.text = '$(error) LiveIDEConnect (Error)';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      statusBarItem.tooltip = 'LiveIDEConnect: Connection Error - Click to reconnect';
      break;
  }
  
  statusBarItem.show();
}

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('LiveIDEConnect');
  outputChannel.appendLine('🚀 LiveIDEConnect extension activated');
  
  // Register Chat Participant and Variables using official VS Code Chat API (1.85+)
  registerChatParticipant(context);
  registerChatVariables(context);
  
  // Create status bar item
  updateStatusBar('disconnected');

  // Connect command
  const connectCommand = vscode.commands.registerCommand('liveideconnect.connect', () => {
    outputChannel?.appendLine('🔌 Manual connect requested...');
    const { token, sessionId } = getConfig();
    outputChannel?.appendLine(`   Token: ${token ? 'Configured' : 'NOT CONFIGURED'} ${token ? `(length: ${token.length})` : ''}`);
    outputChannel?.appendLine(`   Session ID: ${sessionId ? 'Configured' : 'NOT CONFIGURED'} ${sessionId ? `(${sessionId})` : ''}`);
    
    if (!token || !sessionId) {
      vscode.window.showErrorMessage(
        'LiveIDEConnect: Token and sessionId must be configured in settings first.',
        'Open Settings'
      ).then(selection => {
        if (selection === 'Open Settings') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'liveideconnect');
        }
      });
      outputChannel?.show();
      return;
    }
    
    connectWebSocket();
    outputChannel?.show(); // Show output channel so user can see connection progress
  });
  
  // Check connection status command
  const checkStatusCommand = vscode.commands.registerCommand('liveideconnect.checkStatus', () => {
    const { token, sessionId, apiBase } = getConfig();
    const isConnected = ws && ws.readyState === WebSocket.OPEN;
    
    outputChannel?.appendLine('📊 Connection Status Check:');
    outputChannel?.appendLine(`   WebSocket State: ${isConnected ? '✅ CONNECTED' : '❌ NOT CONNECTED'}`);
    outputChannel?.appendLine(`   Token: ${token ? '✅ Configured' : '❌ NOT CONFIGURED'} ${token ? `(length: ${token.length})` : ''}`);
    outputChannel?.appendLine(`   Session ID: ${sessionId ? '✅ Configured' : '❌ NOT CONFIGURED'} ${sessionId ? `(${sessionId})` : ''}`);
    outputChannel?.appendLine(`   API Base: ${apiBase || 'NOT CONFIGURED'}`);
    outputChannel?.appendLine(`   Tab ID: ${tabId}`);
    
    if (ws) {
      outputChannel?.appendLine(`   WebSocket ReadyState: ${ws.readyState} (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)`);
    } else {
      outputChannel?.appendLine(`   WebSocket: Not initialized`);
    }
    
    outputChannel?.show();
    
    if (!isConnected) {
      vscode.window.showInformationMessage(
        'LiveIDEConnect: Not connected. Check the output channel for details.',
        'Connect Now',
        'Open Settings'
      ).then(selection => {
        if (selection === 'Connect Now') {
          vscode.commands.executeCommand('liveideconnect.connect');
        } else if (selection === 'Open Settings') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'liveideconnect');
        }
      });
    } else {
      vscode.window.showInformationMessage('LiveIDEConnect: ✅ Connected!');
    }
  });

  // Disconnect command
  const disconnectCommand = vscode.commands.registerCommand('liveideconnect.disconnect', () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Prevent auto-reconnect
    if (ws) {
      ws.close(1000, 'Manual disconnect'); // 1000 = normal closure
      ws = null;
      outputChannel?.appendLine('🔌 Manually disconnected');
      updateStatusBar('disconnected');
    }
  });

  // Open chat panel command
  const openChatCommand = vscode.commands.registerCommand('liveideconnect.openChat', () => {
    showChatPanel();
  });

  // Process pending chat messages command
  const processPendingCommand = vscode.commands.registerCommand('liveideconnect.processPendingMessages', async () => {
    if (pendingChatMessages.length === 0) {
      vscode.window.showInformationMessage('No pending messages to process.');
      return;
    }
    outputChannel?.appendLine(`🔄 Manually processing ${pendingChatMessages.length} pending messages...`);
    await processPendingChatMessages();
  });

  // Send message command
  const sendMessageCommand = vscode.commands.registerCommand('liveideconnect.sendMessage', async () => {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter your message to send to web app'
    });

    if (input && ws && ws.readyState === WebSocket.OPEN) {
      const message: LiveIdeMessage = {
        type: 'agent_message',
        sessionId: getSessionId(),
        from: 'ide',
        content: input,
        ts: new Date().toISOString()
      };
      
      // Send to web app
      ws.send(JSON.stringify(message));
      outputChannel?.appendLine(`📤 Sent to web app: ${input}`);
      
      // Add to message queue and update panel
      messageQueue.push(message);
      if (chatPanel) {
        chatPanel.webview.postMessage({
          command: 'newMessage',
          message: message
        });
      }
      
      // Offer to also send to Cursor chat (with user consent)
      await sendMessageWithCursorIntegration(input);
    } else if (!ws || ws.readyState !== WebSocket.OPEN) {
      vscode.window.showWarningMessage('Not connected. Please connect first.');
    }
  });

  context.subscriptions.push(connectCommand, disconnectCommand, sendMessageCommand, openChatCommand, checkStatusCommand, processPendingCommand);

  // Auto-connect on startup if configured
  const { token, sessionId } = getConfig();
  outputChannel.appendLine('🚀 LiveIDEConnect extension activated');
  outputChannel.appendLine(`   Token configured: ${token ? 'Yes' : 'No'} ${token ? `(length: ${token.length})` : ''}`);
  outputChannel.appendLine(`   Session ID configured: ${sessionId ? 'Yes' : 'No'} ${sessionId ? `(${sessionId})` : ''}`);
  
  if (token && sessionId) {
    // Validate token and sessionId before attempting connection
    if (token.includes('your-token') || token.includes('example') || token.length < 20) {
      outputChannel.appendLine('⚠️ Invalid token detected. Please set a valid token in settings.');
      outputChannel.appendLine('   Use: "LiveIDEConnect: Connect" command after configuring settings.');
    } else if (sessionId.includes('your-session') || sessionId.includes('example') || sessionId.length < 10) {
      outputChannel.appendLine('⚠️ Invalid sessionId detected. Please set a valid sessionId in settings.');
      outputChannel.appendLine('   Use: "LiveIDEConnect: Connect" command after configuring settings.');
    } else {
      // Delay connection slightly to let VS Code fully initialize
      outputChannel.appendLine('⏳ Auto-connecting in 1 second...');
      setTimeout(() => {
        connectWebSocket();
      }, 1000);
    }
  } else {
    outputChannel.appendLine('⚠️ Token or sessionId not configured.');
    outputChannel.appendLine('   Please configure in settings and use "LiveIDEConnect: Connect" command.');
  }
}

export function deactivate() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  statusBarItem?.dispose();
  outputChannel?.dispose();
}

