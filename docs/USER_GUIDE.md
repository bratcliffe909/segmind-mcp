# Segmind MCP User Guide

This guide will help you use the Segmind MCP server with your AI assistant to generate images, videos, and more.

## Table of Contents
- [Installation](#installation)
- [Configuration](#configuration)
- [Available Models](#available-models)
- [Using the Tools](#using-the-tools)
- [Prompt Examples](#prompt-examples)
- [Tips and Best Practices](#tips-and-best-practices)

## Installation

### Method 1: Zero Install (Recommended)

No installation needed! Just configure your MCP client.

#### For Claude Desktop:

Edit your configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the configuration:
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

The package will be automatically downloaded when first used.

### Method 2: Global Installation

For faster startup times, install globally:

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

### Getting Your API Key

1. Sign up at [segmind.com](https://segmind.com)
2. Go to your dashboard
3. Copy your API key (starts with `sg_`)
4. Add it to the configuration above

## Available Models

### Text-to-Image Models (4 available)

| Model ID | Model Name | Best For | Speed | Quality |
|----------|------------|----------|--------|---------|
| `sdxl` | Stable Diffusion XL | High-quality general images | Medium | High |
| `sdxl-lightning` | SDXL Lightning | Fast generation | Fast | High |
| `fooocus` | Fooocus | Advanced artistic control | Slow | Very High |
| `ssd-1b` | SSD-1B | Efficient generation | Fast | Good |

### Image-to-Image Models (1 available)

| Model ID | Model Name | Best For |
|----------|------------|----------|
| `sd15-img2img` | SD 1.5 Image-to-Image | Style transfer, image editing |

### Enhancement Models (2 available)

| Model ID | Model Name | Best For |
|----------|------------|----------|
| `esrgan` | ESRGAN | Upscaling images 2x-4x |
| `codeformer` | CodeFormer | Face restoration and enhancement |

### Video Generation Models (2 available)

| Model ID | Model Name | Best For | Duration |
|----------|------------|----------|----------|
| `veo-3` | Google Veo 3 | Cinematic quality videos | Auto |
| `seedance-v1-lite` | Seedance V1 Lite | Quick social media videos | 5-10s |

### Text-to-Speech Models (2 available)

| Model ID | Model Name | Best For | Features |
|----------|------------|----------|----------|
| `dia-tts` | Dia TTS | Multi-speaker dialogues | Emotions, nonverbal cues |
| `orpheus-tts` | Orpheus TTS 3B | Natural conversation | Emotion tags |

### Music Generation Models (2 available)

| Model ID | Model Name | Best For | Duration |
|----------|------------|----------|----------|
| `lyria-2` | Lyria 2 | Instrumental music | Auto |
| `minimax-music` | Minimax Music-01 | Songs with vocals | 10-60s |

## Using the Tools

### Generate Image

Basic usage:
```
"Generate an image of a sunset over mountains"
```

With options:
```
"Create a portrait of a robot using sdxl model with high quality"
"Generate 3 variations of a logo with seed 12345"
"Make a 16:9 widescreen image of a space station"
```

### Transform Image

Basic usage:
```
"Transform this image into a watercolor painting"
```

With options:
```
"Apply anime style to this photo with strength 0.5"
"Transform to oil painting style using sd15-img2img"
```

### Enhance Image

Basic usage:
```
"Upscale this image to 4K"
"Enhance this old photo"
```

With options:
```
"Upscale by 4x using esrgan"
"Restore faces in this photo using codeformer"
```

### Generate Video

Basic usage:
```
"Create a 5-second video of ocean waves"
"Generate a video of a butterfly emerging from cocoon"
```

With options:
```
"Create a cinematic video of a futuristic city using veo-3"
"Generate a 10-second video in 9:16 format using seedance-v1-lite"
"Make a time-lapse video of flowers blooming"
```

### Generate Speech (Text-to-Speech)

Basic usage:
```
"Convert this text to speech: Hello, welcome to our service"
"Create an audiobook narration of this paragraph"
```

With dialogue and emotions:
```
"Generate dialogue: [S1] Hello! <laugh> [S2] Hi there! How are you?"
"Create speech with emotions: I'm so excited! <gasp> This is amazing!"
"Use orpheus-tts with voice dan for natural conversation"
```

### Generate Music

Basic usage:
```
"Create relaxing piano music"
"Generate upbeat electronic music"
```

With specific requirements:
```
"Create 30 seconds of jazz music using lyria-2"
"Generate a pop song with vocals about summer using minimax-music"
"Make instrumental background music for a video, peaceful and ambient"
```

## Prompt Examples

### High-Quality Portraits
```
"Generate a professional headshot of a businesswoman, studio lighting, confident smile, using sdxl model with high quality"
```

### Artistic Landscapes
```
"Create a dreamy landscape with floating islands, sunset colors, fantasy art style, using fooocus model"
```

### Quick Concepts
```
"Generate a simple icon of a coffee cup using sdxl-lightning for fast results"
```

### Logo Design
```
"Create a modern minimalist logo for a tech startup, geometric shapes, blue and white colors, generate 4 variations"
```

### Saving Images Directly
```
# For Claude Code - save image directly
"Generate a product photo of a sleek laptop, display_mode='save'"

# For viewing and saving
"Create an avatar portrait, display_mode='both'"
```

### Photo Enhancement
```
"Upscale this product photo by 4x and enhance details using esrgan"
```

### Style Transfer
```
"Transform this photo into a Van Gogh style painting with medium strength using sd15-img2img"
```

### Video Creation
```
"Create a cinematic video of a space station orbiting Earth, dramatic lighting, 4K quality using veo-3"
```

### Multi-Speaker Dialogue
```
"Generate conversation: [S1] Welcome to our podcast! <laugh> [S2] Thanks for having me! (excited) [S1] Let's dive right in..."
```

### Background Music
```
"Create 60 seconds of uplifting corporate background music with piano and strings using lyria-2"
```

## Tips and Best Practices

### 1. Model Selection

**Images**:
- **For speed**: Use `sdxl-lightning` or `ssd-1b`
- **For quality**: Use `sdxl` or `fooocus`
- **For faces**: Use `codeformer` for enhancement
- **For upscaling**: Use `esrgan`

**Videos**:
- **For quality**: Use `veo-3` (includes audio)
- **For speed**: Use `seedance-v1-lite`

**Audio**:
- **For dialogues**: Use `dia-tts` with speaker tags
- **For natural speech**: Use `orpheus-tts`
- **For music**: Use `lyria-2` (instrumental) or `minimax-music` (with vocals)

### 2. Prompt Writing

**Be Specific**: Include details about style, lighting, colors, and composition
```
Good: "A cozy coffee shop interior, warm lighting, wooden furniture, plants, morning sunlight through windows"
Bad: "A coffee shop"
```

**Include Quality Terms**: Add terms that improve output quality
```
"photorealistic", "high quality", "professional", "detailed", "sharp focus"
```

**Use Negative Prompts**: Specify what to avoid
```
"Generate a portrait... avoid: blurry, low quality, distorted features"
```

### 3. Image Dimensions

- Default: 1024x1024 (square)
- Portrait: 768x1024
- Landscape: 1024x768
- Widescreen: 1920x1080 (16:9)
- Social Media: 1080x1080 (Instagram), 1200x630 (Facebook)

### 4. Seed Usage

Use seeds for reproducible results:
```
"Generate a logo with seed 42"
"Create another variation with the same seed"
```

### 5. Managing Credits

- Text-to-image: ~0.2-0.4 credits per image
- Enhancement: ~0.2 credits per operation
- Video generation: ~0.45-2.0 credits per video
- Text-to-speech: ~0.1-0.15 credits per generation
- Music generation: ~0.5-0.8 credits per track
- Generate fewer outputs to save credits
- Use lower resolution/duration for drafts

### 6. Displaying Images in Claude Desktop

When using the segmind-mcp server with Claude Desktop, images are generated successfully but may not always display inline. Here are your options:

**Option 1: Use display_mode parameter**
Control how image data is returned:
- `display_mode: "display"` (default) - Returns image for display
- `display_mode: "save"` - Returns base64 data for saving
- `display_mode: "both"` - Returns both image and base64 data

```
"Generate a sunset landscape with display_mode='save'"
"Create a portrait with display_mode='both' to see and save it"
```

**Option 2: Save and View Images**
If images don't display inline:
1. Use `display_mode: "save"` to get the base64 data
2. The response includes BASE64_IMAGE markers
3. Copy the base64 data between the markers to save the image

**Option 3: Use File Attachments**
For immediate viewing in Claude Desktop:
1. Generate with `display_mode: "save"`
2. Save the decoded image to a file
3. Use Claude Desktop's paperclip icon to attach and view

### 7. Cost Estimation

Use the new `estimate_cost` tool to check credit usage before generating:

```
"Estimate the cost of generating 5 images with sdxl"
"Show me the cost for all text-to-image models"
"What would it cost to generate a 30-second video?"
```

### 8. Common Issues

**"Model not found"**: Check the model ID spelling
**"Invalid dimensions"**: Use multiples of 8 (256, 512, 768, 1024, etc.)
**"API key error"**: Verify your API key in the config
**"Rate limit"**: Wait a moment between requests
**"Images not displaying"**: Use display_mode options or file attachments

## Advanced Usage

### Batch Generation
```
"Generate 4 different logo concepts for a fitness brand, each with unique style"
```

### Precise Control
```
"Create an image with exact dimensions 512x768, guidance scale 7.5, 30 inference steps"
```

### Style Mixing
```
"Transform this photo: 30% oil painting, keep original colors, subtle brush strokes"
```

### Professional Workflows

**Image Production**:
1. Generate rough concepts with `sdxl-lightning`
2. Refine the best one with `fooocus`
3. Upscale final result with `esrgan`
4. Enhance faces if needed with `codeformer`

**Video Production**:
1. Create storyboard images with `sdxl`
2. Generate video clips with `seedance-v1-lite`
3. Create final cinematic version with `veo-3`

**Audio Production**:
1. Generate dialogue with `dia-tts` for multi-speakers
2. Create background music with `lyria-2`
3. Add vocal tracks with `minimax-music`

### Creative Combinations

**Animated Storytelling**:
```
"First, generate a character portrait with sdxl"
"Then, create a video of the character with veo-3"
"Finally, add narration with orpheus-tts"
```

**Music Video Creation**:
```
"Generate visuals with seedance-v1-lite"
"Create matching music with minimax-music"
```

## Troubleshooting

### Saving Generated Images

The Segmind MCP server now supports a `display_mode` parameter for all image generation tools:

**Display Modes**:
- `display` (default): Shows the image in your interface
- `save`: Returns base64 data as text for easy saving
- `both`: Shows the image AND provides base64 data

**Examples**:
```
# View the image (default)
"Generate a sunset landscape"

# Get base64 data for saving
"Generate a sunset landscape with display_mode='save'"

# Both view and save
"Generate a sunset landscape with display_mode='both'"
```

**For Claude Desktop users**: Use `display` mode to see images
**For Claude Code users**: Use `save` mode to get base64 data for direct file operations

**When using save mode**:
- The base64 data is returned between `BASE64_IMAGE_START` and `BASE64_IMAGE_END` markers
- Extract this data and decode it to save as an image file
- The response includes MIME type and suggested file extension

### API Key Issues
- Ensure key starts with `sg_`
- Check for extra spaces
- Verify key is active on Segmind dashboard

### Generation Failures
- Try simpler prompts first
- Use default settings
- Check your credit balance

### Quality Issues
- Add quality terms to prompt
- Use negative prompts
- Try different models
- Adjust guidance scale

## Getting Help

- Check the [README](../README.md) for basic setup
- Visit [Segmind Docs](https://docs.segmind.com) for API details
- Report issues on [GitHub](https://github.com/yourusername/segmind-mcp/issues)