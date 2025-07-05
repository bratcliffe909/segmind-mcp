import * as fs from 'fs/promises';
import * as path from 'path';

import { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { logger } from '../utils/logger.js';

import { BaseTool } from './base.js';

const ReadLocalImageSchema = z.object({
  file_path: z.string().describe('Absolute path to the image file'),
  return_format: z.enum(['base64', 'data_uri']).default('base64').describe('Format to return: base64 string or data URI'),
});

// type ReadLocalImageParams = z.infer<typeof ReadLocalImageSchema>;

export class ReadLocalImageTool extends BaseTool {
  protected readonly name = 'read_local_image';
  protected readonly description = 'Read a local image file and convert it to base64 for use with other tools';

  async execute(params: any): Promise<CallToolResult> {
    try {
      // Validate parameters
      const validated = ReadLocalImageSchema.parse(params);
      
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
      const fileSizeMB = imageBuffer.length / (1024 * 1024);
      if (fileSizeMB > 10) {
        logger.warn(`Large image file: ${fileSizeMB.toFixed(2)}MB. Consider resizing.`);
      }

      // Return based on requested format
      let result: string;
      if (validated.return_format === 'data_uri') {
        result = `data:${mimeType};base64,${base64String}`;
      } else {
        result = base64String;
      }

      // Create response
      const content: TextContent[] = [
        {
          type: 'text',
          text: `Successfully read image: ${path.basename(validated.file_path)}`,
        },
        {
          type: 'text',
          text: `Format: ${ext.substring(1).toUpperCase()}, Size: ${fileSizeMB.toFixed(2)}MB`,
        },
        {
          type: 'text',
          text: `\nBase64 string (${validated.return_format}):`,
        },
        {
          type: 'text',
          text: result,
        },
        {
          type: 'text',
          text: `\nUsage example with transform_image:`,
        },
        {
          type: 'text',
          text: `transform_image({ image: "<copy-base64-above>", prompt: "your transformation", strength: 0.75 })`,
        },
      ];

      return { content };

    } catch (error) {
      logger.error('Failed to read local image', { error });
      return this.createErrorResponse(error);
    }
  }
}

export const readLocalImageTool = new ReadLocalImageTool();