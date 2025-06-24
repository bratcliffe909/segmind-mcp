# Publishing Guide

This guide explains how to publish the Segmind MCP Server to npm and GitHub.

## Prerequisites

1. **npm account**: Create one at https://www.npmjs.com/
2. **GitHub repository**: Create at https://github.com/new
3. **Secrets setup**:
   - `NPM_TOKEN`: Get from npm.com → Account Settings → Access Tokens
   - `SEGMIND_API_KEY`: For testing in GitHub Actions

## Initial Setup

### 1. Update package.json

Replace `yourusername` with your actual GitHub username:
```json
"repository": {
  "type": "git",
  "url": "https://github.com/yourusername/segmind-mcp.git"
},
"bugs": {
  "url": "https://github.com/yourusername/segmind-mcp/issues"
},
"homepage": "https://github.com/yourusername/segmind-mcp#readme"
```

### 2. Login to npm
```bash
npm login
```

### 3. First publish
```bash
npm run build
npm publish --access public
```

## GitHub Setup

### 1. Create repository
```bash
git remote add origin https://github.com/yourusername/segmind-mcp.git
git branch -M main
git push -u origin main
```

### 2. Add GitHub Secrets
Go to Settings → Secrets and variables → Actions:
- `NPM_TOKEN`: Your npm access token
- `SEGMIND_API_KEY`: A test API key (optional)

### 3. Create first release
1. Go to Releases → Create a new release
2. Choose a tag (e.g., v0.1.0)
3. GitHub Actions will automatically publish to npm

## Updating

### Manual publish
```bash
npm version patch  # or minor/major
npm run build
npm publish
git push --tags
```

### Automatic publish
1. Update version in package.json
2. Commit and push
3. Create a new release on GitHub
4. GitHub Actions handles the rest

## Users Can Now Install Via:

### npm (after publishing)
```bash
npm install -g segmind-mcp
```

### GitHub (immediately)
```bash
npm install -g github:yourusername/segmind-mcp
```

### npx (no install needed)
```bash
# From npm
npx segmind-mcp

# From GitHub  
npx github:yourusername/segmind-mcp
```

## Claude Desktop Configuration

Users can use any of these in their Claude Desktop config:

```json
{
  "mcpServers": {
    "segmind": {
      "command": "npx",
      "args": ["segmind-mcp"],
      "env": {
        "SEGMIND_API_KEY": "their_api_key"
      }
    }
  }
}
```