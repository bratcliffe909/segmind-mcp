# Image Preparation Guide for Claude

When using image transformation or enhancement tools with Claude, you need to provide images in base64 format. This guide explains how to prepare your local images.

## The Problem

Claude cannot directly read local image files from paths like `C:\Users\ben\Pictures\photo.jpg`. Instead, images must be:
1. Uploaded to the chat (drag & drop)
2. Provided as URLs
3. Converted to base64 strings

## Solution: Image Preparation Script

We provide a helper script to convert your local images to base64 format.

### Installation

If you have the segmind-mcp package installed globally:
```bash
npm install -g @bratcliffe909/mcp-server-segmind
```

### Usage

1. **Navigate to the segmind-mcp directory** (or wherever you saved the script)
2. **Run the preparation script:**
   ```bash
   node scripts/prepare-image.js "C:\Users\ben\Pictures\photo.jpg"
   ```

3. **The script will:**
   - Convert your image to base64
   - Save it as `photo.jpg.base64.txt`
   - Show you example usage

4. **Copy the base64 string** from the text file

5. **Use it with Claude:**
   ```javascript
   transform_image({
     image: "<paste-base64-string-here>",
     prompt: "transform into a beautiful oil painting",
     strength: 0.75
   })
   ```

## Alternative Methods

### Method 1: Drag & Drop (Easiest)
Simply drag your image file into the Claude chat window. Claude will handle the conversion automatically.

### Method 2: Online Converter
1. Use an online base64 converter (search "image to base64 converter")
2. Upload your image
3. Copy the base64 string (without the `data:image/jpeg;base64,` prefix)
4. Use it in the image parameter

### Method 3: Using Desktop Commander (if installed)
If you have Desktop Commander MCP server:
```javascript
// Read and convert in one step
DC: read_file "C:\Users\ben\Pictures\photo.jpg" true
```

## File Size Considerations

- **Recommended**: Keep images under 2MB
- **Maximum**: Most tools support up to 10MB
- **Resize large images** before converting to avoid issues

## Supported Formats

- JPEG/JPG
- PNG
- GIF
- WebP
- BMP

## Example Workflow

1. **Original request:**
   ```
   "Turn this photo into a painting: C:\Users\ben\Pictures\vacation.jpg"
   ```

2. **Prepare the image:**
   ```bash
   node scripts/prepare-image.js "C:\Users\ben\Pictures\vacation.jpg"
   ```

3. **Copy base64 from `vacation.jpg.base64.txt`**

4. **Use with Claude:**
   ```javascript
   transform_image({
     image: "<base64-string>",
     prompt: "beautiful impressionist painting with vibrant colors",
     strength: 0.8,
     display_mode: "display"
   })
   ```

## Troubleshooting

### "File too large" error
- Resize your image to under 2048x2048 pixels
- Use image compression tools
- Try JPEG format instead of PNG

### "Invalid base64" error
- Make sure you copied the entire string
- Don't include the `data:image...` prefix
- Use a text editor for very long strings

### "Cannot read file" error
- Check the file path is correct
- Ensure the file exists
- Try using forward slashes: `C:/Users/ben/Pictures/photo.jpg`