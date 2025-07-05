import * as fs from 'fs/promises';
import * as path from 'path';

import { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { imageCache } from '../utils/image-cache.js';
import { logger } from '../utils/logger.js';

import { BaseTool } from './base.js';

const PrepareImageSchema = z.object({
  file_path: z.string().describe('Absolute path to the image file'),
  max_size_kb: z.number().optional().default(800).describe('Maximum size in KB before warning (default: 800KB)'),
});

export class PrepareImageTool extends BaseTool {
  protected readonly name = 'prepare_image';
  protected readonly description = 'Prepare a local image for use with other tools. Returns a temporary image ID instead of base64 to avoid context limits. Use this ID with transform_image or enhance_image.';

  async execute(params: any): Promise<CallToolResult> {
    try {
      // Validate parameters
      const validated = PrepareImageSchema.parse(params);
      
      // Validate file path is absolute
      if (!path.isAbsolute(validated.file_path)) {
        return {
          content: [{
            type: 'text',
            text: `Error: File path must be absolute. Got: ${validated.file_path}`,
          } as TextContent],
          isError: true,
        };
      }

      // Check if file exists
      try {
        await fs.access(validated.file_path);
      } catch {
        return {
          content: [{
            type: 'text',
            text: `Error: File not found: ${validated.file_path}`,
          } as TextContent],
          isError: true,
        };
      }

      // Get file extension to determine MIME type
      const ext = path.extname(validated.file_path).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp',
      };

      const mimeType = mimeTypes[ext];
      if (!mimeType) {
        return {
          content: [{
            type: 'text',
            text: `Error: Unsupported image format: ${ext}. Supported: jpg, jpeg, png, gif, webp, bmp`,
          } as TextContent],
          isError: true,
        };
      }

      // Read file and convert to base64
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const imageBuffer = await fs.readFile(validated.file_path);
      const base64String = imageBuffer.toString('base64');
      
      // Check file size
      const fileSizeKB = imageBuffer.length / 1024;
      const fileSizeMB = fileSizeKB / 1024;
      
      // Store in cache and get ID
      const imageId = imageCache.store(base64String, mimeType, validated.file_path);
      
      // Create response
      const content: TextContent[] = [
        {
          type: 'text',
          text: `✅ Image prepared successfully!`,
        },
        {
          type: 'text',
          text: `📁 File: ${path.basename(validated.file_path)}`,
        },
        {
          type: 'text',
          text: `📏 Size: ${fileSizeMB.toFixed(2)}MB (${fileSizeKB.toFixed(0)}KB)`,
        },
        {
          type: 'text',
          text: `🔑 Image ID: ${imageId}`,
        },
      ];

      // Add warning if large
      if (fileSizeKB > validated.max_size_kb) {
        content.push({
          type: 'text',
          text: `⚠️  Warning: Image is large (${fileSizeKB.toFixed(0)}KB). This may cause slow processing.`,
        });
      }

      content.push(
        {
          type: 'text',
          text: `\n📋 Usage examples:`,
        },
        {
          type: 'text',
          text: `transform_image({ image: "${imageId}", prompt: "oil painting style" })`,
        },
        {
          type: 'text',
          text: `enhance_image({ image: "${imageId}", operation: "upscale" })`,
        },
        {
          type: 'text',
          text: `\n💡 Tip: This image ID is temporary and will expire in 15 minutes.`,
        }
      );

      return { content };

    } catch (error) {
      logger.error('Failed to prepare image', { error });
      return this.createErrorResponse(error);
    }
  }
}

export const prepareImageTool = new PrepareImageTool();