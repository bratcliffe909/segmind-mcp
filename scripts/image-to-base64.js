#!/usr/bin/env node

/**
 * Convert an image file to base64 format for use with Segmind MCP tools
 * Usage: node image-to-base64.js <image-path>
 * 
 * This outputs a base64 string that can be used with transform_image, enhance_image, etc.
 */

const fs = require('fs');
const path = require('path');

// Check if file path was provided
if (process.argv.length < 3) {
  console.error('Usage: node image-to-base64.js <image-path>');
  console.error('Example: node image-to-base64.js C:\\Users\\ben\\Pictures\\photo.jpg');
  process.exit(1);
}

const imagePath = process.argv[2];

// Check if file exists
if (!fs.existsSync(imagePath)) {
  console.error(`Error: File not found: ${imagePath}`);
  process.exit(1);
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
  console.error(`Error: Unsupported image format: ${ext}`);
  console.error('Supported formats: jpg, jpeg, png, gif, webp, bmp');
  process.exit(1);
}

try {
  // Read file and convert to base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64String = imageBuffer.toString('base64');
  
  // Output just the base64 string (without data URI prefix)
  // The MCP tool will handle adding the prefix if needed
  console.log(base64String);
  
  // Also save to a text file for easy copying
  const outputPath = imagePath + '.base64.txt';
  fs.writeFileSync(outputPath, base64String);
  console.error(`\nBase64 string also saved to: ${outputPath}`);
  console.error(`\nTo use with Claude, copy the base64 string and use it in the image parameter.`);
  
} catch (error) {
  console.error(`Error reading file: ${error.message}`);
  process.exit(1);
}