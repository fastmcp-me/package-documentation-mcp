# 📚 DocsFetcher MCP Server

[![smithery badge](https://smithery.ai/badge/@cdugo/mcp-get-docs)](https://smithery.ai/server/@cdugo/mcp-get-docs)

An MCP server that fetches npm package documentation for LLMs like Claude without requiring API keys.

Coming Soon: Deploying on Smithery

## ✨ Features

- 📦 Fetches documentation for npm packages (by name or URL)
- 📄 Extracts README, API docs, examples, and GitHub info
- 🧠 Provides structured data for LLM summarization
- 💬 Includes specialized prompts for documentation analysis
- 🔑 **No API key required** - works natively with Claude Desktop and Cursor IDE

## 🚀 Installation

### Prerequisites

- 📋 Node.js 18 or later

### Quick Install

```bash
git clone https://github.com/cdugo/package-documentation-mcp
cd package-documentation-mcp
npm run install-server
```

Follow the prompts to build and configure for Claude Desktop and/or Cursor IDE.

### Manual Install

```bash
git clone https://github.com/cdugo/package-documentation-mcp
cd package-documentation-mcp
npm install
npm run build
```

## 🏃‍♂️ Running Locally

Once installed, you can run the server locally with:

```bash
# From the project root directory
npm start
```

For development with auto-restart on file changes:

```bash
npm run dev
```

The server will start on the default port (usually 3000). You should see output like:

```
🚀 DocsFetcher MCP Server running!
📋 Ready to fetch documentation
```

To specify a custom port:

```bash
PORT=8080 npm start
```

## ⚙️ Configuration

### Claude Desktop

1. Open Claude Desktop → Settings → Developer
2. Click "Edit Config" and add:

```json
{
  "mcpServers": {
    "docsFetcher": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/docs-fetcher-mcp/build/index.js"]
    }
  }
}
```

### Cursor IDE

1. Edit your Cursor config file:
   - macOS/Linux: `~/.cursor/cursor_config.json`
   - Windows: `%APPDATA%\Cursor\cursor_config.json`
2. Add the same configuration as above

## 🛠️ Available Tools

1. **fetch-url-docs**: 🔗 Fetch docs from a specific URL
2. **fetch-package-docs**: 📦 Fetch docs for an npm package
3. **fetch-library-docs**: 🧠 Smart tool that works with either package name or URL

## 📝 Available Prompts

1. **summarize-library-docs**: 📚 Create a comprehensive library summary
2. **explain-dependency-error**: 🐛 Generate dependency error explanations

## 💡 Example Queries

### Basic Library Information

- "What is Express.js and how do I use it?"
- "Tell me about the React library"

### Dependency Error Resolution

- "I'm getting an error: 'Cannot find module 'lodash''"
- "npm ERR! Cannot find module 'dotenv'. What does this mean?"

### Using Prompts

- "@summarize-library-docs with libraryName='express'"
- "@explain-dependency-error with packageName='dotenv'"

## ❓ Troubleshooting

- **Server not showing up**: ✅ Verify absolute path in configuration
- **Connection errors**: 🔄 Restart Claude Desktop or Cursor IDE
- **Fetch failures**: ⚠️ Some packages may have non-standard documentation

## 📄 License

MIT
