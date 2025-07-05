# Segmind MCP Server

[![npm version](https://badge.fury.io/js/@bratcliffe909%2Fmcp-server-segmind.svg)](https://www.npmjs.com/package/@bratcliffe909/mcp-server-segmind)

Model Context Protocol server for Segmind's AI image and video generation API. Access 30+ state-of-the-art AI models including FLUX, Stable Diffusion XL, and more directly from any MCP-compatible AI assistant.

## Quick Start

### 1. Get your Segmind API key
Sign up at [segmind.com](https://segmind.com) to get your API key.

### 2. Configure your MCP client

#### For Claude Desktop:

Edit your configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the Segmind server:
```json
{
  "mcpServers": {
    "segmind": {
      "command": "npx",
      "args": ["-y", "@bratcliffe909/mcp-server-segmind@latest"],
      "env": {
        "SEGMIND_API_KEY": "your_segmind_api_key_here"
      }
    }
  }
}
```

#### For Claude Code:

Use the command line to add the MCP server:
```bash
claude mcp add segmind -e SEGMIND_API_KEY=your_segmind_api_key_here -- npx -y @bratcliffe909/mcp-server-segmind@latest
```

For user scope (available across all projects):
```bash
claude mcp add segmind -s user -e SEGMIND_API_KEY=your_segmind_api_key_here -- npx -y @bratcliffe909/mcp-server-segmind@latest
```

Verify the connection:
```bash
/mcp
```

#### For Other MCP clients:
Check your client's documentation for config location

### 3. Restart your MCP client

- **Claude Desktop**: Restart the application
- **Claude Code**: The server connects immediately, verify with `/mcp`

That's it! The server will automatically download and run when needed. No installation or setup required!

### Alternative: Install Globally

If you prefer to install the package globally:

```bash
npm install -g @bratcliffe909/mcp-server-segmind
```

#### Claude Desktop configuration:
```json
{
  "mcpServers": {
    "segmind": {
      "command": "mcp-server-segmind",
      "env": {
        "SEGMIND_API_KEY": "your_segmind_api_key_here"
      }
    }
  }
}
```

#### Claude Code command:
```bash
claude mcp add segmind -e SEGMIND_API_KEY=your_segmind_api_key_here -- mcp-server-segmind
```

## Available Tools

### 🎨 generate_image
Create images from text descriptions using various AI models.

**Basic Examples:**
```
"Generate an image of a futuristic city at sunset"
"Create a portrait of a robot in Renaissance style"
"Make an image of a cozy coffee shop interior"
```

**Advanced Examples with Options:**
```
"Generate a high-quality landscape photo of mountains using flux-1-pro"
"Create 3 variations of a cute cat logo with seed 12345"
"Make a 16:9 widescreen image of a space station"
```

**Available Options:**
- `model`: Choose specific model (sdxl, flux-1-pro, ideogram-3, gpt-image-1, seedream-v3)
- `width/height`: Image dimensions (256-2048, must be multiples of 8)
- `num_images`: Generate 1-4 variations
- `quality`: draft, standard, or high
- `style`: Add style modifiers (e.g., "photorealistic", "anime", "oil painting")
- `seed`: Use specific seed for reproducible results

### 🔄 transform_image  
Transform existing images using AI models.

**Basic Examples:**
```
"Transform this image into a watercolor painting"
"Change the style to cyberpunk"
"Make it look like a sketch"
```

**Advanced Examples:**
```
"Apply subtle oil painting style with strength 0.5"
"Transform to anime style using sd15-img2img"
"Add dramatic lighting and shadows with high strength"
```

**Available Options:**
- `model`: sd15-img2img (default)
- `strength`: 0.0-1.0 (how much to transform, default 0.75)
- `negative_prompt`: What to avoid in transformation
- `seed`: For reproducible transformations

### 🎬 generate_video
Create videos from text descriptions or animate static images.

**Basic Examples:**
```
"Create a 5-second video of a butterfly emerging from a cocoon"
"Generate a video of waves crashing on a beach"
"Make a video of futuristic cityscape at night"
```

**Advanced Examples:**
```
"Create a 10-second cinematic video using veo-3 model"
"Generate multi-shot video with seedance-v1-lite"
"Animate this landscape photo with gentle movement"
```

**Available Options:**
- `model`: veo-3, seedance-v1-lite
- `duration`: 5-10 seconds
- `aspect_ratio`: 16:9, 9:16, 1:1, 4:3
- `quality`: standard, high, ultra
- `seed`: For reproducible videos

### ✨ enhance_image
Improve image quality and resolution.

**Basic Examples:**
```
"Upscale this image to 4K"
"Remove noise from this photo"
"Enhance and sharpen this old photograph"
```

**Advanced Examples:**
```
"Upscale by 4x using esrgan model"
"Enhance face details using codeformer"
"Upscale image with face enhancement enabled"
"Restore old portrait with codeformer"
```

**Available Options:**
- `enhancement_type`: upscale, denoise
- `model`: esrgan (for upscaling) or codeformer (for face enhancement)
- `scale`: 2x or 4x (for upscaling with esrgan)
- `strength`: 0.0-1.0 (enhancement intensity)
- `face_enhance`: true/false (for esrgan)

### 🎤 generate_audio
Generate speech from text using advanced TTS models.

**Basic Examples:**
```
"Convert this text to speech: Hello world"
"Read this text aloud: Welcome to our presentation"
"Generate speech: The quick brown fox jumps over the lazy dog"
```

**Advanced Examples:**
```
"Create dialogue: [S1] Hello! [S2] Hi there! (laughs)"
"Generate slow speech with speed_factor 0.8: Important announcement"
"Use orpheus-tts with voice emma: Hello everyone"
```

**Controlling Speech Pace:**

For slower, more deliberate speech:
```
"Generate speech: Hello everyone. (pauses) Today we'll discuss... (hesitates) something very important."
"Use speed_factor 0.8: This is an important safety announcement."
"Add pauses: Please listen carefully — (pauses) — this information could save your life."
```

**Available Options:**
- `model`: dia-tts (multi-speaker, emotions) or orpheus-tts (4 voices)
- `voice`: tara, dan, josh, emma (orpheus only)
- `speed_factor`: 0.5-1.5 (dia only, default 0.94=normal, try 0.8 for slower, 1.1 for faster)
- `temperature`: 0.1-2.0 (expressiveness)
- `max_new_tokens`: Control audio length

**Pacing Techniques (dia-tts):**
- Use punctuation: periods (.), commas (,), ellipsis (...) for natural pauses
- Add non-verbal cues: (pauses), (sighs), (hesitates), (breathes deeply)
- Combine with speed_factor for overall tempo control

### 🎵 generate_music
Create original music from text descriptions.

**Basic Examples:**
```
"Create relaxing piano music for meditation"
"Generate upbeat electronic dance music"
"Make ambient background music"
```

**Advanced Examples:**
```
"Generate 60 seconds of jazz with saxophone using minimax-music"
"Create instrumental lo-fi hip hop beats for studying"
"Make epic orchestral music with duration 45 seconds"
```

**Available Options:**
- `model`: lyria-2 (instrumental) or minimax-music (with vocals)
- `duration`: 1-60 seconds (minimax) or default 30s (lyria)
- `negative_prompt`: What to avoid in the music
- `seed`: For reproducible music generation

### 💰 estimate_cost
Check credit costs before generating content.

**Examples:**
```
"Estimate the cost of generating 5 images with sdxl"
"Show me the cost for all text-to-image models"
"What would it cost to create a 30-second video with veo-3?"
"List all model costs"
```

**Available Options:**
- `model`: Specific model to estimate
- `category`: Model category to compare
- `num_images`: Number of images (1-10)
- `num_outputs`: Number of outputs (1-10)
- `list_all`: Show all model costs

## Supported Models

The server includes 13 verified working models across 7 categories:

### Text-to-Image Generation (4 models)
- **sdxl** - Stable Diffusion XL: High-quality image generation with SDXL 1.0
- **sdxl-lightning** - SDXL Lightning: Fast high-quality image generation (8 steps)
- **fooocus** - Fooocus: Advanced image generation with refinement options
- **ssd-1b** - SSD-1B: Efficient billion-parameter model for fast generation

### Image-to-Image Transformation (1 model)
- **sd15-img2img** - SD 1.5 Image-to-Image: Transform existing images with Stable Diffusion 1.5

### Image Enhancement (2 models)
- **esrgan** - ESRGAN: AI-powered image upscaling (2x-4x) and enhancement
- **codeformer** - CodeFormer: AI face restoration and enhancement

### Video Generation (2 models)
- **veo-3** - Google Veo 3: Advanced text-to-video with realistic audio synthesis
- **seedance-v1-lite** - Seedance V1 Lite: Fast high-quality multi-shot video generation

### Text-to-Speech (2 models)
- **dia-tts** - Dia: Ultra-realistic multi-speaker dialogue with emotions and nonverbal cues
- **orpheus-tts** - Orpheus TTS 3B: Open-source TTS with emotion tags and natural speech

### Music Generation (2 models)
- **lyria-2** - Lyria 2: High-fidelity 48kHz stereo instrumental music generation
- **minimax-music** - Minimax Music-01: Generate up to 60 seconds of music with vocals

## Configuration Options

Set these environment variables in your MCP client config:

```json
{
  "env": {
    "SEGMIND_API_KEY": "required - your API key",
    "LOG_LEVEL": "info",  // error, warn, info, debug
    "CACHE_ENABLED": "true",
    "MAX_IMAGE_SIZE": "10485760",  // 10MB
    "FILE_OUTPUT_LOCATION": "/path/to/save/images"  // Optional, defaults to system temp
  }
}
```

### File Output

Images are automatically saved to your local filesystem (Claude Desktop cannot display images from MCP servers).

- Default location: System temp directory
- Custom location: Set `FILE_OUTPUT_LOCATION` to any directory
- Override per request: Use `save_location` parameter in your prompt

Example:
```
"Generate an image of a sunset"
// Result: Image saved to: /tmp/sdxl-1705783456789.png

"Generate a logo and save to /Users/me/Desktop"
// Result: Image saved to: /Users/me/Desktop/sdxl-1705783456790.png
```

### Working with Local Images

To use your local images with transform_image or enhance_image tools, you need to convert them to base64 format first.

#### Option 1: Drag & Drop (Easiest)
Simply drag your image file into the Claude chat window.

#### Option 2: Use the Preparation Script
```bash
# Navigate to the package directory
cd node_modules/@bratcliffe909/mcp-server-segmind
# Or if installed globally: cd $(npm root -g)/@bratcliffe909/mcp-server-segmind

# Convert your image
node scripts/prepare-image.js "C:\Users\YourName\Pictures\photo.jpg"

# This creates photo.jpg.base64.txt - copy its contents for use with Claude
```

#### Option 3: Online Converter
Use any "image to base64" online converter and copy the result.

See [docs/IMAGE_PREPARATION.md](docs/IMAGE_PREPARATION.md) for detailed instructions.

## Development

If you want to contribute or modify the server:

```bash
git clone https://github.com/bratcliffe909/segmind-mcp.git
cd segmind-mcp
npm install
npm run build
npm link
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## Troubleshooting

### "MCP error -32000: Connection closed"

This error often occurs due to command execution issues. Try these solutions:

#### For Windows users:
```json
{
  "mcpServers": {
    "segmind": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@bratcliffe909/mcp-server-segmind@latest"],
      "env": {
        "SEGMIND_API_KEY": "your_segmind_api_key_here"
      }
    }
  }
}
```

#### For NVM users:
Install globally instead of using npx:
```bash
npm install -g @bratcliffe909/mcp-server-segmind
```

Then use:
```json
{
  "mcpServers": {
    "segmind": {
      "command": "mcp-server-segmind",
      "args": [],
      "env": {
        "SEGMIND_API_KEY": "your_segmind_api_key_here"
      }
    }
  }
}
```

#### General solutions:
1. Ensure Node.js is installed in your system (not just in WSL)
2. Restart Claude Desktop after configuration changes
3. Check npm registry settings in `~/.npmrc`
4. Verify the `-y` flag is included in the args array

### "API key not found" error
Make sure your `SEGMIND_API_KEY` is set correctly in your MCP client's configuration.

### "Command not found" error  
Ensure npm's global bin directory is in your PATH, or use the full path to npx.

### Images not displaying
Your MCP client should display images automatically. Ensure you're using a client that supports image display.

## Security

- API keys are never logged or stored
- All requests use HTTPS
- Input validation on all parameters
- Rate limiting to prevent abuse

## Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Documentation

- [Quick Start Guide](docs/QUICKSTART.md) - Getting started quickly
- [User Guide](docs/USER_GUIDE.md) - Detailed usage and examples
- [Available Models](docs/MODELS.md) - Complete model reference
- [Parameter Reference](docs/PARAMETERS.md) - Comprehensive parameter documentation
- [Contributing Guide](CONTRIBUTING.md) - How to contribute

## Links

- [Segmind API Documentation](https://docs.segmind.com)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Report Issues](https://github.com/bratcliffe909/segmind-mcp/issues)