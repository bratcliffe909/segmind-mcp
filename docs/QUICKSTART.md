# Segmind MCP Server - Quick Start Guide

Get started with Segmind MCP in just 2 minutes!

## Prerequisites

- Node.js 18 or higher
- An MCP-compatible AI client
- A Segmind API key from [segmind.com](https://segmind.com)

## Installation

No need to clone or build anything! Simply configure your MCP client:

### 1. Get Your API Key

Sign up at [segmind.com](https://segmind.com) and copy your API key (starts with `sg_`).

### 2. Configure your MCP client

Add this to your MCP client's configuration file. Common locations:

**Claude Desktop (macOS)**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Claude Desktop (Windows)**: `%APPDATA%\Claude\claude_desktop_config.json`  
**Other clients**: Check your client's documentation

```json
{
  "mcpServers": {
    "segmind": {
      "command": "npx",
      "args": ["segmind-mcp"],
      "env": {
        "SEGMIND_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### 3. Restart your MCP client

That's it! The server will automatically download and run when needed.

## Alternative: Global Installation

If you prefer to install globally:

```bash
npm install -g segmind-mcp
```

Then use this configuration:

```json
{
  "mcpServers": {
    "segmind": {
      "command": "segmind-mcp",
      "env": {
        "SEGMIND_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Start Using It!

Ask your AI assistant to generate images:

```
"Generate an image of a sunset over mountains"
"Create a logo for a tech startup"
"Transform this photo into a watercolor painting"
"Upscale this image to 4K"
```

## Available Models

**Text-to-Image (4 models)**
- `sdxl` - High quality, general purpose
- `sdxl-lightning` - Fast generation
- `fooocus` - Advanced artistic control
- `ssd-1b` - Efficient generation

**Video Generation (2 models)**
- `veo-3` - Google Veo 3 with realistic audio synthesis
- `seedance-v1-lite` - Fast multi-shot video generation

**Text-to-Speech (2 models)**
- `dia-tts` - Multi-speaker dialogue with emotions
- `orpheus-tts` - Natural conversational speech

**Music Generation (2 models)**
- `lyria-2` - 48kHz stereo instrumental music
- `minimax-music` - Music with vocals up to 60 seconds

**Image Enhancement (2 models)**
- `esrgan` - Upscale images 2x-4x
- `codeformer` - Face restoration

**Image Transformation (1 model)**
- `sd15-img2img` - Style transfer and editing

## Quick Examples

### Generate Image
```
"Create a professional headshot of a robot, studio lighting"
"Generate 3 variations of a minimalist logo"
"Make a 16:9 landscape of alien planets"
```

### Enhance Image
```
"Upscale this product photo by 4x"
"Enhance and restore this old photograph"
```

### Transform Image
```
"Turn this photo into an oil painting"
"Apply anime style with 50% strength"
```

### Generate Video
```
"Create a 5-second video of a butterfly emerging from a cocoon"
"Animate this landscape photo with gentle wind and clouds"
```

### Generate Speech
```
"Convert this text to speech: Hello world"
"Create a dialogue: [S1] Hello! [S2] Hi there! <laugh>"
```

### Generate Music
```
"Create relaxing piano music for meditation"
"Generate upbeat electronic music for a workout"
```

## Configuration Options

Optional environment variables in your MCP config:

```json
{
  "env": {
    "SEGMIND_API_KEY": "required",
    "LOG_LEVEL": "info",     // error, warn, info, debug
    "CACHE_ENABLED": "true", // Enable caching
    "MAX_IMAGE_SIZE": "10485760" // 10MB limit
  }
}
```

## Troubleshooting

### "API key not found"
- Check your API key starts with `sg_`
- Verify it's correctly set in the config
- No extra spaces or quotes

### "Command not found"  
- Try using `npx segmind-mcp` instead
- Or install globally: `npm install -g segmind-mcp`

### Images not showing
- Ensure your MCP client supports image display
- Check the logs for errors

## Testing Your Setup (Optional)

If you want to verify your API key works:

```bash
# Test without installing
npx segmind-mcp test-api

# Or if installed globally
segmind-mcp test-api
```

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/segmind-mcp/issues)
- **API Docs**: [docs.segmind.com](https://docs.segmind.com)
- **Full Guide**: See [USER_GUIDE.md](USER_GUIDE.md)