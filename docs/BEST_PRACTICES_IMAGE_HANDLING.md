# Best Practices for Image Handling in Claude Desktop

## The Problem

Claude Desktop with MCP has limitations when handling images:
1. **Cannot display images** returned from MCP servers
2. **Drag & drop doesn't auto-convert** to base64 for MCP tools
3. **File paths don't work** - tools need base64 strings

## Solutions (In Order of Preference)

### 1. Use the Built-in Tool (NEW in v1.1.9)
```javascript
// First, read your local image
read_local_image({
  file_path: "C:\\Users\\ben\\Pictures\\photo.jpg",
  return_format: "base64"
})

// Then copy the base64 output and use with transform_image
transform_image({
  image: "<paste-base64-here>",
  prompt: "transform into oil painting",
  strength: 0.75
})
```

### 2. Use the Helper Script (v1.1.7+)
```bash
# Find where npm installed the package
cd $(npm root -g)/@bratcliffe909/mcp-server-segmind

# Convert image
node scripts/prepare-image.js "C:\Users\ben\Pictures\photo.jpg"

# Copy from the generated .base64.txt file
```

### 3. Use Another MCP Server
If you have Desktop Commander or similar:
```
DC: read_file "C:\Users\ben\Pictures\photo.jpg" true
```

### 4. Online Converter
- Search "image to base64 converter"
- Upload your image
- Copy the base64 string (without the prefix)

## Important Notes

1. **File Size**: Keep images under 2MB for best results
2. **Formats**: JPG, PNG, GIF, WebP, BMP supported
3. **Base64 Only**: Don't include `data:image/jpeg;base64,` prefix
4. **Two Steps**: Always read first, then use the base64

## Example Workflow

**What doesn't work:**
```
"Transform this photo: C:\path\to\photo.jpg"
```

**What works:**
```
Step 1: "Read this image: C:\path\to\photo.jpg"
Step 2: "Transform the image I just read into an oil painting"
```

## Why This Happens

- MCP servers communicate via JSON
- Images must be encoded as base64 strings
- Claude Desktop can't access local files directly
- The display limitation is a current MCP restriction

## Future Improvements

We're working on:
- Automatic image reading when paths are provided
- Better integration with Claude's native image handling
- Possibly supporting image URLs directly