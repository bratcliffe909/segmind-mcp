#!/usr/bin/env node

/**
 * Prepare an image for use with Segmind MCP tools
 * This script converts local images to base64 format that Claude can use
 * 
 * Usage: 
 *   npx segmind-mcp prepare-image <image-path>
 *   node scripts/prepare-image.js <image-path>
 * 
 * Example:
 *   npx segmind-mcp prepare-image "C:\Users\ben\Pictures\photo.jpg"
 * 
 * Output:
 *   - Displays the base64 string
 *   - Saves it to a .base64.txt file
 *   - Shows example usage with Claude
 */

const fs = require('fs');
const path = require('path');

// Check if file path was provided
if (process.argv.length < 3) {
  console.log('Segmind MCP - Image Preparation Tool');
  console.log('====================================\n');
  console.log('This tool converts local images to base64 format for use with Claude.\n');
  console.log('Usage: node prepare-image.js <image-path>');
  console.log('Example: node prepare-image.js "C:\\Users\\ben\\Pictures\\photo.jpg"\n');
  console.log('Supported formats: JPG, PNG, GIF, WebP, BMP');
  process.exit(1);
}

const imagePath = process.argv[2];

// Check if file exists
if (!fs.existsSync(imagePath)) {
  console.error(`❌ Error: File not found: ${imagePath}`);
  process.exit(1);
}

// Check file size
const stats = fs.statSync(imagePath);
const fileSizeMB = stats.size / (1024 * 1024);

if (fileSizeMB > 10) {
  console.warn(`⚠️  Warning: File is ${fileSizeMB.toFixed(2)}MB. Large files may cause issues.`);
  console.warn('   Consider resizing the image to under 2MB for best results.\n');
}

// Get file extension to determine MIME type
const ext = path.extname(imagePath).toLowerCase();
const mimeTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp'
};

const mimeType = mimeTypes[ext];
if (!mimeType) {
  console.error(`❌ Error: Unsupported image format: ${ext}`);
  console.error('   Supported formats: jpg, jpeg, png, gif, webp, bmp');
  process.exit(1);
}

try {
  console.log('🖼️  Processing image...\n');
  
  // Read file and convert to base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64String = imageBuffer.toString('base64');
  
  // Save to file
  const outputPath = imagePath + '.base64.txt';
  fs.writeFileSync(outputPath, base64String);
  
  console.log('✅ Success! Image converted to base64.\n');
  console.log(`📁 Base64 string saved to: ${outputPath}`);
  console.log(`📏 Base64 length: ${base64String.length} characters\n`);
  
  console.log('📋 How to use with Claude:');
  console.log('================================');
  console.log('1. Copy the contents of the .base64.txt file');
  console.log('2. Use it in your Claude request like this:\n');
  
  console.log('Example for transform_image:');
  console.log('----------------------------');
  console.log(`transform_image({
  image: "<paste-base64-here>",
  prompt: "transform into a beautiful oil painting",
  strength: 0.75,
  display_mode: "display"
})\n`);

  console.log('Example for enhance_image:');
  console.log('--------------------------');
  console.log(`enhance_image({
  image: "<paste-base64-here>",
  operation: "upscale",
  scale: "4",
  display_mode: "display"
})\n`);

  console.log('💡 Tip: The base64 string is very long. Use a text editor to copy it properly.');
  
  // If file is small enough, offer to display it
  if (base64String.length < 1000) {
    console.log('\n📄 Base64 string (short enough to display):');
    console.log('==========================================');
    console.log(base64String);
  }
  
} catch (error) {
  console.error(`❌ Error reading file: ${error.message}`);
  process.exit(1);
}