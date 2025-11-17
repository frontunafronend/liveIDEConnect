# Angular MCP (Model Context Protocol) Setup

## ✅ Configuration Complete!

Angular MCP has been configured for your project. This allows AI assistants in Cursor to interact directly with your Angular CLI.

## 📋 What Was Added

### `.cursor/mcp.json`
- MCP server configuration for Cursor IDE
- Points to Angular CLI MCP server
- Configured to run from `fullstack/FE` directory

## 🔧 Requirements

**Note**: Angular MCP requires **Angular CLI 20.1+**. Your project currently uses Angular 19.

### Option 1: Upgrade Angular (Recommended)
```bash
cd fullstack/FE
ng update @angular/cli @angular/core
```

### Option 2: Use Latest CLI for MCP Only
The configuration uses `@angular/cli@latest` via npx, so it will use the latest CLI version for MCP commands even if your project uses Angular 19.

## 🚀 Available MCP Tools

Once configured, the Angular MCP server provides these tools:

1. **`get_best_practices`**
   - Retrieves the Angular Best Practices Guide
   - Helps AI assistants provide Angular-specific guidance

2. **`list_projects`**
   - Lists all applications and libraries in your Angular workspace
   - Helps AI understand your project structure

3. **`search_documentation`**
   - Searches the official Angular documentation
   - Provides accurate, up-to-date Angular information

## 📝 How It Works

1. **AI Assistant Requests**: When you ask Cursor's AI about Angular, it can use these MCP tools
2. **MCP Server Responds**: Angular CLI MCP server provides context and information
3. **Better Assistance**: AI gets accurate Angular-specific information

## 🔍 Testing

To verify MCP is working:

1. **Restart Cursor** (required for MCP config changes)
2. **Ask Cursor AI**: "What Angular best practices should I follow?"
3. **Check Output**: AI should use MCP tools to provide Angular-specific guidance

## 📚 Configuration Details

The MCP configuration:
- **Server Name**: `angular-cli`
- **Command**: `npx` (runs Angular CLI without installing globally)
- **Args**: `["-y", "@angular/cli@latest", "mcp"]`
- **Working Directory**: `fullstack/FE` (your Angular project root)

## 🎯 Benefits

- ✅ **Better Angular Guidance**: AI gets context from Angular CLI
- ✅ **Accurate Documentation**: Searches official Angular docs
- ✅ **Project Awareness**: Understands your Angular workspace structure
- ✅ **Best Practices**: Provides Angular-specific recommendations

## 🔄 Updating

To update the MCP configuration, edit `.cursor/mcp.json` and restart Cursor.

## 📖 References

- [Angular MCP Documentation](https://angular.dev/ai/mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)

