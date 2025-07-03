# Installation Guide - Segmind MCP Server

## Overview

The Segmind MCP Server is distributed as an npm package that works seamlessly with any MCP-compatible AI client. You don't need to download or build anything manually.

## Requirements

- Node.js 18 or higher installed on your system
- A Segmind API key from [segmind.com](https://segmind.com)
- An MCP-compatible AI client

## Installation Methods

### Method 1: Zero-Install with npx (Recommended)

This is the easiest method - no installation required!

1. **Get your API key** from [segmind.com](https://segmind.com)

2. **Configure your MCP client**:

   #### For Claude Desktop:
   Edit your configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

   Add this configuration:
   ```json
   {
     "mcpServers": {
       "segmind": {
         "command": "npx",
         "args": ["-y", "@bratcliffe909/mcp-server-segmind@latest"],
         "env": {
           "SEGMIND_API_KEY": "your_api_key_here"
         }
       }
     }
   }
   ```

   #### For Claude Code:
   Use the command line:
   ```bash
   claude mcp add segmind -e SEGMIND_API_KEY=your_api_key_here -- npx -y @bratcliffe909/mcp-server-segmind@latest
   ```
   
   For user scope (available across all projects):
   ```bash
   claude mcp add segmind -s user -e SEGMIND_API_KEY=your_api_key_here -- npx -y @bratcliffe909/mcp-server-segmind@latest
   ```

   #### For Other MCP clients:
   Check your client's documentation for the config file location

3. **Verify the installation**:
   - **Claude Desktop**: Restart the application
   - **Claude Code**: Check connection with `/mcp` command

When you first use a Segmind command, npx will automatically download and run the latest version.

### Method 2: Global Installation

For faster startup times, you can install the package globally:

1. **Install the package**:
   ```bash
   npm install -g @bratcliffe909/mcp-server-segmind
   ```

2. **Configure your MCP client**:

   #### Claude Desktop configuration:
   ```json
   {
     "mcpServers": {
       "segmind": {
         "command": "mcp-server-segmind",
         "env": {
           "SEGMIND_API_KEY": "your_api_key_here"
         }
       }
     }
   }
   ```

   #### Claude Code command:
   ```bash
   claude mcp add segmind -e SEGMIND_API_KEY=your_api_key_here -- mcp-server-segmind
   ```

3. **Verify the installation**:
   - **Claude Desktop**: Restart the application
   - **Claude Code**: Check connection with `/mcp` command

### Method 3: Local Installation (Advanced)

For specific version control or custom modifications:

1. **Create a directory** for MCP servers:
   ```bash
   mkdir ~/mcp-servers
   cd ~/mcp-servers
   ```

2. **Install locally**:
   ```bash
   npm install @bratcliffe909/mcp-server-segmind
   ```

3. **Configure with full path**:
   ```json
   {
     "mcpServers": {
       "segmind": {
         "command": "node",
         "args": ["~/mcp-servers/node_modules/@bratcliffe909/mcp-server-segmind/dist/index.js"],
         "env": {
           "SEGMIND_API_KEY": "your_api_key_here"
         }
       }
     }
   }
   ```

## Verifying Installation

### Quick Test

After configuration, you can verify your setup:

1. If using npx:
   ```bash
   npx @bratcliffe909/mcp-server-segmind@latest test-api
   ```

2. If installed globally:
   ```bash
   mcp-server-segmind test-api
   ```

This will check if your API key is valid and properly configured.

### In your MCP client

Simply ask your AI assistant to generate an image:
```
"Generate an image of a sunset"
```

If everything is configured correctly, your AI assistant will use the Segmind MCP server to create the image.

#### Claude Code specific:
You can check which MCP servers are connected by typing:
```
/mcp
```

This will show you the status of all connected MCP servers, including Segmind.

## Configuration Options

You can add optional environment variables to your MCP configuration:

```json
{
  "mcpServers": {
    "segmind": {
      "command": "npx",
      "args": ["-y", "@bratcliffe909/mcp-server-segmind@latest"],
      "env": {
        "SEGMIND_API_KEY": "your_api_key_here",
        "LOG_LEVEL": "info",        // Options: error, warn, info, debug
        "CACHE_ENABLED": "true",    // Enable response caching
        "MAX_IMAGE_SIZE": "10485760" // Max image size in bytes (10MB)
      }
    }
  }
}
```

## Updating

### With npx (Method 1)
- Always uses the latest version automatically
- No manual updates needed

### With global installation (Method 2)
```bash
npm update -g @bratcliffe909/mcp-server-segmind
```

### With local installation (Method 3)
```bash
cd ~/mcp-servers
npm update @bratcliffe909/mcp-server-segmind
```

## Troubleshooting

### "command not found" error
- Ensure Node.js 18+ is installed: `node --version`
- If using global install, check npm's bin directory is in PATH
- Try using the npx method instead

### "API key not found" error
- Check your API key is correctly entered in the config
- Ensure no extra quotes or spaces around the key
- Verify the key starts with `sg_`

### "npm not found" error
- Install Node.js from [nodejs.org](https://nodejs.org)
- Restart your terminal after installation

### MCP client doesn't show the tools
- Ensure you restarted your MCP client after configuration
- Check the configuration file syntax is valid JSON
- Look for error messages in your MCP client's logs

## Uninstalling

### If using npx
Just remove the configuration from your MCP client's config file.

### If installed globally
```bash
npm uninstall -g @bratcliffe909/mcp-server-segmind
```

### If installed locally
```bash
cd ~/mcp-servers
npm uninstall @bratcliffe909/mcp-server-segmind
```

## Next Steps

- Read the [Quick Start Guide](QUICKSTART.md)
- Explore the [User Guide](USER_GUIDE.md) for detailed usage
- Check out [available models](MODELS.md)
- Learn about [prompting tips](USER_GUIDE.md#prompt-examples)