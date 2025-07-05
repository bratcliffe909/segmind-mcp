# Segmind MCP - Available Models

This document lists all currently available models in the Segmind MCP server.

## Model Categories

### 📸 Text-to-Image Generation (4 models)

Generate images from text descriptions.

#### SDXL (Stable Diffusion XL)
- **Model ID**: `sdxl`
- **Endpoint**: `/v1/sdxl1.0-txt2img`
- **Description**: High-quality image generation with SDXL 1.0
- **Best for**: General purpose, photorealistic images, artistic styles
- **Speed**: Medium (10s)
- **Credits**: 0.3 per image
- **Default size**: 1024x1024
- **Max size**: 2048x2048

**Example prompts**:
```
"A majestic mountain landscape at golden hour, photorealistic"
"Portrait of a cyberpunk character, neon lighting, detailed"
"Cozy cabin in the woods, autumn colors, oil painting style"
```

#### SDXL Lightning
- **Model ID**: `sdxl-lightning`
- **Endpoint**: `/v1/sdxl1.0-newreality-lightning`
- **Description**: Fast high-quality image generation
- **Best for**: Quick iterations, concept art, rapid prototyping
- **Speed**: Fast (5s)
- **Credits**: 0.2 per image
- **Default size**: 512x512
- **Max size**: 2048x2048
- **Special**: Only needs 8 inference steps

**Example prompts**:
```
"Simple logo design, minimalist, vector style"
"Quick character sketch, anime style"
"Product mockup, clean background"
```

#### Fooocus
- **Model ID**: `fooocus`
- **Endpoint**: `/v1/fooocus`
- **Description**: Advanced image generation with refinement options
- **Best for**: High-quality artistic images, fine control
- **Speed**: Slow (12s)
- **Credits**: 0.4 per image
- **Special features**: Built-in refinement, multiple LoRA support

**Example prompts**:
```
"Fantasy castle, intricate details, magical atmosphere"
"Fashion photography, professional studio lighting"
"Architectural visualization, modern building, sunset"
```

#### SSD-1B
- **Model ID**: `ssd-1b`
- **Endpoint**: `/v1/ssd-1b`
- **Description**: Efficient billion-parameter model
- **Best for**: Fast generation with good quality
- **Speed**: Medium (8s)
- **Credits**: 0.25 per image
- **Default size**: 512x512

**Example prompts**:
```
"Mobile app icon, flat design, colorful"
"Simple illustration, children's book style"
"Web banner, modern design, tech theme"
```

### 🎨 Image-to-Image Transformation (1 model)

Transform existing images with AI guidance.

#### SD 1.5 Image-to-Image
- **Model ID**: `sd15-img2img`
- **Endpoint**: `/v1/sd1.5-img2img`
- **Description**: Transform existing images with Stable Diffusion 1.5
- **Best for**: Style transfer, image editing, variations
- **Speed**: Medium (8s)
- **Credits**: 0.3 per transformation
- **Strength**: 0.0-1.0 (how much to change)

**Example uses**:
```
"Transform photo to watercolor painting" (strength: 0.7)
"Make this sketch more detailed" (strength: 0.5)
"Change day scene to night" (strength: 0.8)
```

### ✨ Image Enhancement (2 models)

Improve image quality and resolution.

#### ESRGAN
- **Model ID**: `esrgan`
- **Endpoint**: `/v1/esrgan`
- **Description**: AI-powered image upscaling
- **Best for**: Increasing resolution, enhancing details
- **Speed**: Fast (5s)
- **Credits**: 0.2 per enhancement
- **Scale options**: 2x, 4x
- **Features**: Optional face enhancement

**Example uses**:
```
"Upscale product photo to 4K"
"Enhance old family photo"
"Improve texture details in game asset"
```

#### CodeFormer
- **Model ID**: `codeformer`
- **Endpoint**: `/v1/codeformer`
- **Description**: AI face restoration and enhancement
- **Best for**: Fixing faces, portrait enhancement
- **Speed**: Fast (5s)
- **Credits**: 0.2 per enhancement
- **Fidelity**: 0.0-1.0 (balance between quality and identity)

**Example uses**:
```
"Restore faces in old photograph"
"Enhance portrait quality"
"Fix AI-generated face artifacts"
```

### 🎬 Video Generation (2 models)

Create videos from text descriptions.

#### Google Veo 3
- **Model ID**: `veo-3`
- **Endpoint**: `/v1/veo-3`
- **Description**: Advanced text-to-video with realistic audio synthesis
- **Best for**: Cinematic content, realistic scenes, high-quality videos
- **Speed**: Slow (30s)
- **Credits**: 2.0 per video
- **Output**: MP4 format
- **Special**: Includes realistic audio synthesis

**Example prompts**:
```
"Cinematic shot of ocean waves at sunset, dramatic lighting"
"Time-lapse of flowers blooming in a garden"
"Aerial view of a futuristic city with flying cars"
```

#### Seedance V1 Lite
- **Model ID**: `seedance-v1-lite`
- **Endpoint**: `/v1/seedance-v1-lite-text-to-video`
- **Description**: Fast high-quality multi-shot video generation
- **Best for**: Quick videos, multi-shot sequences, social media content
- **Speed**: Medium (20s)
- **Credits**: 0.45 per video
- **Duration**: 5-10 seconds
- **Aspect ratios**: 16:9, 4:3, 1:1, 3:4, 9:16
- **Resolution**: 480p, 720p

**Example prompts**:
```
"Dancing robot in a disco, colorful lights"
"Product showcase rotating 360 degrees"
"Nature documentary style: butterfly on flower"
```

### 🎤 Text-to-Speech (2 models)

Convert text to natural-sounding speech.

#### Dia TTS
- **Model ID**: `dia-tts`
- **Endpoint**: `/v1/dia`
- **Description**: Ultra-realistic multi-speaker dialogue with emotions
- **Best for**: Dialogues, audiobooks, voice acting
- **Speed**: Medium (10s)
- **Credits**: 0.15 per generation
- **Features**: Multiple speakers ([S1], [S2]), emotions, nonverbal cues
- **Output**: MP3/WAV

**Example uses**:
```
"[S1] Hello there! <laugh> [S2] Hi! How are you today? (excited)"
"[S1] The sunset was beautiful. (wistful) [S2] Yes, I'll never forget it."
"Single speaker narration with emotional depth"
```

#### Orpheus TTS 3B
- **Model ID**: `orpheus-tts`
- **Endpoint**: `/v1/orpheus-3b-0.1`
- **Description**: Open-source TTS with emotion tags
- **Best for**: Natural conversation, emotional speech
- **Speed**: Fast (8s)
- **Credits**: 0.1 per generation
- **Voices**: tara, dan, josh, emma
- **Emotion tags**: <laugh>, <sigh>, <gasp>, <clear throat>

**Example uses**:
```
"Welcome to our service! <laugh> We're happy to help you."
"I'm not sure... <sigh> Let me think about it."
"Breaking news! <gasp> This is incredible!"
```

### 🎵 Music Generation (2 models)

Create original music from text descriptions.

#### Lyria 2
- **Model ID**: `lyria-2`
- **Endpoint**: `/v1/lyria-2`
- **Description**: High-fidelity 48kHz stereo instrumental music
- **Best for**: Background music, instrumental tracks, ambient sounds
- **Speed**: Medium (25s)
- **Credits**: 0.5 per generation
- **Output**: 48kHz stereo MP3/WAV
- **Special**: Instrumental only, no vocals

**Example prompts**:
```
"Peaceful acoustic guitar with soft piano, meditation music"
"Epic orchestral score for a battle scene"
"Jazz fusion with saxophone and electric guitar"
```

#### Minimax Music-01
- **Model ID**: `minimax-music`
- **Endpoint**: `/v1/minimax-music-01`
- **Description**: Generate music with accompaniment and vocals
- **Best for**: Complete songs, music with lyrics, vocal tracks
- **Speed**: Slow (40s)
- **Credits**: 0.8 per generation
- **Duration**: 10-60 seconds
- **Special**: Can generate vocals and lyrics

**Example prompts**:
```
"Upbeat pop song about summer vacation"
"Emotional ballad with piano and strings"
"Electronic dance music with catchy vocals"
```

## Model Selection Guide

### By Use Case

**Product Images**
- Generation: `sdxl` or `ssd-1b`
- Enhancement: `esrgan`

**Portraits**
- Generation: `sdxl` or `fooocus`
- Enhancement: `codeformer`
- Style transfer: `sd15-img2img`

**Concept Art**
- Quick drafts: `sdxl-lightning`
- Final quality: `fooocus`

**Logo Design**
- Fast iterations: `sdxl-lightning` or `ssd-1b`
- High quality: `sdxl`

**Video Content**
- Cinematic quality: `veo-3`
- Social media: `seedance-v1-lite`

**Audio Content**
- Dialogues/Audiobooks: `dia-tts`
- Natural speech: `orpheus-tts`
- Background music: `lyria-2`
- Songs with vocals: `minimax-music`

### By Speed Priority

**Fastest** (< 5s)
1. `sdxl-lightning`
2. `esrgan`
3. `codeformer`

**Medium** (5-10s)
1. `orpheus-tts` (8s)
2. `ssd-1b` (8s)
3. `sd15-img2img` (8s)
4. `sdxl` (10s)
5. `dia-tts` (10s)

**Slow** (10-30s)
1. `fooocus` (12s)
2. `seedance-v1-lite` (20s)
3. `lyria-2` (25s)
4. `veo-3` (30s)

**Slowest** (> 30s)
1. `minimax-music` (40s)

### By Quality Priority

**Highest Quality**
1. `fooocus`
2. `sdxl`
3. `sdxl-lightning`
4. `ssd-1b`

### By Credit Efficiency

**Most Efficient** (credits per result)
1. `orpheus-tts` (0.1)
2. `dia-tts` (0.15)
3. `esrgan` (0.2)
4. `codeformer` (0.2)
5. `sdxl-lightning` (0.2)
6. `ssd-1b` (0.25)
7. `sdxl` (0.3)
8. `sd15-img2img` (0.3)
9. `fooocus` (0.4)
10. `seedance-v1-lite` (0.45)
11. `lyria-2` (0.5)
12. `minimax-music` (0.8)
13. `veo-3` (2.0)

## Parameter Reference

### Common Parameters

**All Models**
- `seed`: Reproducible randomness (any integer)

**Text-to-Image Models**
- `prompt`: Text description (required)
- `negative_prompt`: What to avoid
- `num_images` / `samples`: Number of variations (1-4)
- `width` / `img_width`: Image width (multiples of 8)
- `height` / `img_height`: Image height (multiples of 8)
- `guidance_scale`: Prompt adherence (1-20, default 7.5)
- `num_inference_steps`: Quality/speed tradeoff

**Image-to-Image Models**
- `image`: Base64 encoded input image (required)
- `strength`: Transformation amount (0.0-1.0)
- All text-to-image parameters

**Enhancement Models**
- `image`: Base64 encoded input image (required)
- `scale`: Upscale factor (2, 4) - ESRGAN only
- `fidelity`: Quality vs identity (0.0-1.0) - CodeFormer only
- `face_enhance`: Enable face enhancement - ESRGAN only

**Video Generation Models**
- `prompt`: Video description (required)
- `seed`: Reproducible randomness
- `duration`: Video length in seconds - Seedance only
- `aspect_ratio`: Video dimensions - Seedance only
- `resolution`: Output quality - Seedance only

**Text-to-Speech Models**
- `text`: Text to convert (required)
- `voice`: Speaker voice - Orpheus only
- `top_p`: Sampling parameter (0.1-1.0)
- `temperature`: Creativity control (0.1-2.0)
- `cfg_scale`: Guidance strength - Dia only
- `speed_factor`: Speech speed - Dia only

**Music Generation Models**
- `prompt`: Music description (required)
- `negative_prompt`: What to avoid - Lyria only
- `duration`: Music length in seconds - Minimax only
- `seed`: Reproducible randomness

## Detailed Parameter Documentation

For comprehensive documentation of all parameters for each model, including:
- Complete parameter descriptions
- Valid ranges and constraints  
- Default values
- Available options (schedulers, styles, voices, etc.)
- Model-specific features

**→ See: [Complete Parameter Reference](PARAMETERS.md)**

## Tips for Best Results

### Image Generation
- Be specific about style, lighting, and composition
- Use negative prompts to exclude unwanted elements
- Start with default settings then adjust

### Video Generation
- Describe motion and camera movement
- Keep scenes simple for better results
- Use consistent style descriptors

### Audio Generation
- For TTS: Use emotion tags and speaker markers
- For music: Describe genre, mood, and instruments
- Specify tempo and energy level

Check the [User Guide](USER_GUIDE.md) for more detailed examples!