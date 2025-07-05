# Model Parameters Reference

This document provides a comprehensive reference for all parameters available in each Segmind model.

## Table of Contents
- [Text-to-Image Models](#text-to-image-models)
  - [SDXL](#sdxl-stable-diffusion-xl)
  - [SDXL Lightning](#sdxl-lightning)
  - [Fooocus](#fooocus)
  - [SSD-1B](#ssd-1b)
- [Image-to-Image Models](#image-to-image-models)
  - [SD 1.5 Image-to-Image](#sd-15-image-to-image)
- [Image Enhancement](#image-enhancement)
  - [ESRGAN](#esrgan)
  - [CodeFormer](#codeformer)
- [Video Generation](#video-generation)
  - [Veo-3](#veo-3)
  - [Seedance V1 Lite](#seedance-v1-lite)
- [Text-to-Speech](#text-to-speech)
  - [Dia TTS](#dia-tts)
  - [Orpheus TTS](#orpheus-tts)
- [Music Generation](#music-generation)
  - [Lyria 2](#lyria-2)
  - [Minimax Music](#minimax-music)

---

## Text-to-Image Models

### SDXL (Stable Diffusion XL)

High-quality image generation with SDXL 1.0.

| Parameter | Type | Default | Range/Options | Description |
|-----------|------|---------|---------------|-------------|
| prompt | string | required | - | Text description of the image to generate |
| negative_prompt | string | optional | - | What to avoid in the generated image |
| img_width | number | 1024 | 256-2048 (multiples of 8) | Image width in pixels |
| img_height | number | 1024 | 256-2048 (multiples of 8) | Image height in pixels |
| samples | number | 1 | 1-4 | Number of images to generate |
| guidance_scale | number | 7.5 | 1-20 | Controls prompt adherence (higher = stricter) |
| num_inference_steps | number | 25 | 1-100 | Number of denoising steps (more = higher quality, slower) |
| seed | number | optional | any integer | Random seed for reproducible results |
| scheduler | string | DDIM | See below | Sampling algorithm |

**Available Schedulers:**
- DDIM (default) - Fast, good quality
- DPMSolverMultistep - High quality, slower
- PNDM - Good balance
- EulerDiscreteScheduler - Fast convergence
- Others may be available

### SDXL Lightning

Fast high-quality generation - optimized for speed.

| Parameter | Type | Default | Range/Options | Description |
|-----------|------|---------|---------------|-------------|
| prompt | string | required | - | Text description of the image to generate |
| negative_prompt | string | optional | - | What to avoid in the generated image |
| img_width | number | 512 | 256-2048 (multiples of 8) | Image width in pixels |
| img_height | number | 512 | 256-2048 (multiples of 8) | Image height in pixels |
| samples | number | 1 | 1-4 | Number of images to generate |
| guidance_scale | number | 2 | 1-20 | Prompt strength (lower values work better for Lightning) |
| num_inference_steps | number | 8 | 1-20 | Optimized for 8 steps |
| seed | number | optional | any integer | Random seed for reproducible results |

### Fooocus

Advanced generation with style presets and enhancement options.

| Parameter | Type | Default | Range/Options | Description |
|-----------|------|---------|---------------|-------------|
| prompt | string | required | - | Text description of the image to generate |
| negative_prompt | string | optional | - | What to avoid in the generated image |
| styles | string | optional | See below | Comma-separated list of style presets |
| aspect_ratio | string | 1024×1024 | See below | Image dimensions preset |
| image_number | number | 1 | 1-4 | Number of images to generate |
| image_seed | number | optional | any integer | Random seed for reproducible results |
| sharpness | number | 2 | 0-30 | Image sharpness enhancement |
| guidance_scale | number | 7 | 1-30 | Prompt adherence strength |
| base_model | string | optional | See below | Base model selection |
| refiner_model | string | optional | - | Refiner model for quality enhancement |
| loras | string | optional | - | LoRA model configurations as JSON string |

**Available Styles:** (Common examples)
- Fooocus V2, Fooocus Enhance, Fooocus Sharp
- SAI Anime, SAI Digital Art, SAI Photographic
- Artstyle Impressionist, Artstyle Watercolor
- Dark Fantasy, Steampunk, Cyberpunk
- Many more available - experiment!

**Aspect Ratios:**
- 704×1408, 704×1344, 768×1344, 768×1280
- 832×1216, 832×1152, 896×1152, 896×1088
- 960×1088, 960×1024, 1024×1024 (default)
- 1024×960, 1088×960, 1088×896, 1152×896
- 1152×832, 1216×832, 1280×768, 1344×768
- 1344×704, 1408×704, 1472×704, 1536×640
- 1600×640, 1664×576, 1728×576

**Base Models:**
- juggernautXL_version6Rundiffusion
- sd_xl_base_1.0_0.9vae
- sd_xl_refiner_1.0_0.9vae
- Others may be available

### SSD-1B

Efficient billion-parameter model for fast generation.

| Parameter | Type | Default | Range/Options | Description |
|-----------|------|---------|---------------|-------------|
| prompt | string | required | - | Text description of the image to generate |
| negative_prompt | string | optional | - | What to avoid in the generated image |
| img_width | number | 1024 | 256-2048 (multiples of 8) | Image width in pixels |
| img_height | number | 1024 | 256-2048 (multiples of 8) | Image height in pixels |
| samples | number | 1 | 1-4 | Number of images to generate |
| guidance_scale | number | 7.5 | 1-20 | Prompt adherence strength |
| num_inference_steps | number | 25 | 1-100 | Number of denoising steps |
| seed | number | optional | any integer | Random seed for reproducible results |
| scheduler | string | DDIM | Various | Sampling algorithm |

---

## Image-to-Image Models

### SD 1.5 Image-to-Image

Transform existing images using Stable Diffusion 1.5.

| Parameter | Type | Default | Range/Options | Description |
|-----------|------|---------|---------------|-------------|
| image | string | required | base64/URL | Input image to transform |
| prompt | string | required | - | Description of desired transformation |
| negative_prompt | string | optional | - | What to avoid in the transformation |
| width | number | 512 | 64-1024 (multiples of 8) | Output image width |
| height | number | 512 | 64-1024 (multiples of 8) | Output image height |
| samples | number | 1 | 1-4 | Number of variations to generate |
| guidance_scale | number | 7.5 | 0.1-30 | How closely to follow the prompt |
| num_inference_steps | number | 25 | 10-100 | Number of denoising steps |
| strength | number | 0.75 | 0-1 | Transformation strength (0=no change, 1=complete) |
| seed | number | optional | any integer | Random seed for reproducible results |
| scheduler | string | DDIM | Various | Sampling algorithm |

---

## Image Enhancement

### ESRGAN

AI-powered image upscaling and enhancement.

| Parameter | Type | Default | Range/Options | Description |
|-----------|------|---------|---------------|-------------|
| image | string | required | base64/URL | Input image to enhance |
| scale | number | 4 | 2, 4 | Upscaling factor |
| face_enhance | boolean | false | true/false | Enhance faces specifically |

### CodeFormer

AI face restoration and enhancement.

| Parameter | Type | Default | Range/Options | Description |
|-----------|------|---------|---------------|-------------|
| image | string | required | base64/URL | Input image with faces to restore |
| fidelity | number | 0.5 | 0-1 | Balance between quality and identity (0=quality, 1=identity) |
| background_enhance | boolean | false | true/false | Enhance non-face areas |
| face_upsample | boolean | false | true/false | Upscale restored faces |
| upscale | number | 2 | 1-4 | Overall upscaling factor |

---

## Video Generation

### Veo-3

Google's advanced text-to-video with cinematic quality and audio synthesis.

| Parameter | Type | Default | Range/Options | Description |
|-----------|------|---------|---------------|-------------|
| prompt | string | required | max 2000 chars | Detailed scene description |
| duration | number | 10 | 5-10 | Video length in seconds |
| aspect_ratio | string | 16:9 | 16:9, 9:16, 1:1 | Video dimensions |
| resolution | string | 720p | 480p, 720p, 1080p | Video quality |
| fps | number | 24 | 24, 30 | Frames per second |
| motion | string | auto | auto, slow, medium, fast | Camera/scene motion |
| style | string | optional | - | Visual style modifier |
| seed | number | optional | any integer | Random seed |

**Note:** Veo-3 uses 2.0 credits per generation and includes audio synthesis.

### Seedance V1 Lite

Fast multi-shot video generation with dynamic scenes.

| Parameter | Type | Default | Range/Options | Description |
|-----------|------|---------|---------------|-------------|
| prompt | string | required | - | Scene descriptions (supports multi-shot with \| separator) |
| duration | number | 5 | 5-10 | Video length in seconds |
| aspect_ratio | string | 16:9 | 16:9, 9:16, 1:1, 4:3 | Video dimensions |
| resolution | string | 720p | 480p, 720p | Video quality |
| seed | number | optional | any integer | Random seed for reproducibility |

---

## Text-to-Speech

### Dia TTS

Ultra-realistic multi-speaker dialogue with emotions and nonverbal cues.

| Parameter | Type | Default | Range/Options | Description |
|-----------|------|---------|---------------|-------------|
| text | string | required | - | Text with speaker tags [S1], [S2], emotions, and cues |
| speed_factor | number | 0.94 | 0.5-1.5 | Playback speed (0.94=normal, <0.94=slower, >0.94=faster) |
| top_p | number | 0.95 | 0.1-1 | Controls word variety (higher = rarer words) |
| cfg_scale | number | 4 | 1-5 | How strictly to follow text (higher = more accurate) |
| temperature | number | 1.3 | 0.1-2 | Controls randomness (higher = more variety) |
| input_audio | string | optional | base64 | Base64 audio for voice cloning (.wav, .mp3, .flac) |
| max_new_tokens | number | 3072 | 500-4096 | Controls audio length (higher = longer audio) |
| cfg_filter_top_k | number | 35 | 10-100 | Filters audio tokens (higher = more diverse sounds) |
| seed | number | optional | any integer | Random seed for reproducible results |

**Speaker Format:** `[S1] Hello! [S2] Hi there!`

**Controlling Speech Pace and Delivery:**

1. **Natural Pacing with Punctuation:**
   - Periods (.) create natural sentence pauses
   - Commas (,) add brief pauses
   - Ellipsis (...) creates longer dramatic pauses
   - Em-dashes (—) create medium pauses with emphasis

2. **Non-verbal Cues (in parentheses):**
   - `(pauses)` - Insert explicit pause
   - `(sighs)` - Natural sigh with pause
   - `(laughs)` - Laughter sound
   - `(clears throat)` - Throat clearing
   - `(breathes deeply)` - Audible breathing
   - `(hesitates)` - Natural hesitation
   - `(thinks)` - Thoughtful pause

3. **Speed Control:**
   - `speed_factor`: Affects overall playback speed
     - 0.5-0.8: Significantly slower speech
     - 0.8-0.9: Slightly slower than normal
     - 0.94: Normal conversational speed (default)
     - 1.0-1.1: Slightly faster than normal
     - 1.1-1.5: Significantly faster speech
   - Note: speed_factor may also affect pitch/prosody

4. **Example with Pacing Controls:**
   ```
   [S1] Hello everyone. (pauses) Today we'll discuss... (hesitates) something very important.
   [S2] Yes, (breathes deeply) this topic requires careful consideration.
   [S1] Let me explain — (pauses) — it's not as simple as it seems...
   ```

5. **Tips for Natural Pacing:**
   - Use punctuation naturally as you would in written text
   - Add non-verbal cues where natural pauses would occur in speech
   - Combine speed_factor with text markup for best results
   - Experiment with different combinations for desired effect

### Orpheus TTS

Natural conversational speech with 4 distinct voices.

| Parameter | Type | Default | Range/Options | Description |
|-----------|------|---------|---------------|-------------|
| text | string | required | - | Input text with optional emotion tags |
| voice | string | dan | tara, dan, josh, emma | Voice character selection |
| top_p | number | 0.95 | 0.1-1 | Nucleus sampling probability |
| temperature | number | 0.6 | 0.1-1.5 | Sampling temperature for variation |
| max_new_tokens | number | 1200 | 100-2000 | Maximum tokens (controls audio length) |
| repetition_penalty | number | 1.1 | 1-2 | Penalty for repeated phrases |

**Available Voices:**
- **tara**: Female voice, clear and professional
- **dan**: Male voice, warm and conversational (default)
- **josh**: Male voice, deeper tone
- **emma**: Female voice, friendly and expressive

**Emotion Tags (in text):**
- `<laugh>` - Natural laughter
- `<sigh>` - Audible sigh
- `<gasp>` - Surprised gasp
- `<pause>` - Brief pause
- `...` - Natural pause (ellipsis)

**Example:**
```
Hello everyone <pause> I'm excited to share this with you <laugh>
```

**Note:** Orpheus does NOT support speed_factor. Use Dia TTS if you need speed control.

---

## Music Generation

### Lyria 2

High-fidelity 48kHz stereo instrumental music generation.

| Parameter | Type | Default | Range/Options | Description |
|-----------|------|---------|---------------|-------------|
| prompt | string | required | - | Music style and mood description |
| duration | number | 30 | 10-60 | Length in seconds |
| negative_prompt | string | optional | - | Musical elements to avoid |
| seed | number | optional | any integer | Random seed for reproducibility |

**Prompt Examples:**
- "Upbeat electronic dance music with synth leads"
- "Calm piano melody with string accompaniment"
- "Epic orchestral soundtrack with brass section"

### Minimax Music

Generate music with vocals up to 60 seconds.

| Parameter | Type | Default | Range/Options | Description |
|-----------|------|---------|---------------|-------------|
| prompt | string | required | - | Music description including style, mood, instruments |
| duration | number | 30 | 5-60 | Length in seconds |

**Prompt Examples:**
- "Pop song with female vocals about summer love"
- "Rock ballad with male vocals and guitar solo"
- "Electronic track with vocoder vocals"

---

## Common Parameters Across Models

### Seed
- **Purpose**: Ensures reproducible results
- **Usage**: Same seed + same parameters = same output
- **Range**: Any integer value
- **Default**: Random if not specified

### Guidance Scale
- **Purpose**: Controls how closely output follows the prompt
- **Low values (1-5)**: More creative/loose interpretation
- **Medium values (5-10)**: Balanced adherence
- **High values (10-20)**: Strict prompt following
- **Note**: Very high values may reduce quality

### Negative Prompt
- **Purpose**: Specify what to avoid in generation
- **Examples**: "blurry, low quality, distorted, watermark"
- **Best Practice**: Be specific about unwanted elements

### Display Mode (for all image/video tools)
- **display**: Return for immediate viewing
- **save**: Return base64 for saving
- **both**: Return both formats

### Save Location
- **Purpose**: Override default save directory
- **Usage**: Specify full path where files should be saved
- **Example**: "/Users/username/Pictures/AI"