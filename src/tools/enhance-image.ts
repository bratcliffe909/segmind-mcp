import * as fs from 'fs/promises';
import * as path from 'path';

import { CallToolResult, TextContent, ImageContent } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { modelRegistry, ModelCategory } from '../models/registry.js';
import { imageCache } from '../utils/image-cache.js';
import { logger } from '../utils/logger.js';

import { BaseTool } from './base.js';

const EnhanceImageSchema = z.object({
  image: z.string().describe('Input image as base64 string or URL'),
  operation: z.enum(['upscale', 'restore', 'remove_background', 'colorize', 'denoise']).describe('Enhancement operation to perform'),
  model: z.string().optional().describe('Specific model to use for enhancement'),
  scale: z.enum(['2', '4', '8']).default('4').describe('Upscaling factor (for upscale operation)'),
  face_enhance: z.boolean().default(false).describe('Enhance faces during upscaling'),
  return_mask: z.boolean().default(false).describe('Return mask for background removal'),
  alpha_matting: z.boolean().default(true).describe('Use alpha matting for cleaner edges'),
  denoise_strength: z.number().min(0).max(1).default(0.5).describe('Denoising strength'),
  batch_size: z.number().int().min(1).max(10).default(1).describe('Number of images to process'),
  save_location: z.string().optional().describe('Directory path to save the image. Overrides default save location.'),
});

type EnhanceImageParams = z.infer<typeof EnhanceImageSchema>;

export class EnhanceImageTool extends BaseTool {
  protected readonly name = 'enhance_image';
  protected readonly description = 'Enhance images with upscaling, restoration, background removal, and more';

  async execute(params: any): Promise<CallToolResult> {
    try {
      // Validate parameters
      const validated = EnhanceImageSchema.parse(params);
      
      // Validate image input
      const imageValidation = await this.validateImageInput(validated.image);
      if (!imageValidation.isValid) {
        return {
          content: [{
            type: 'text',
            text: `Invalid image input: ${imageValidation.error}`,
          } as TextContent],
          isError: true,
        };
      }

      // Select appropriate model based on operation
      const model = this.selectModel(validated);
      if (!model) {
        return {
          content: [{
            type: 'text',
            text: `No suitable model found for ${validated.operation} operation.`,
          } as TextContent],
          isError: true,
        };
      }

      logger.info(`Selected model ${model.id} for ${validated.operation} operation`);

      // Determine save location
      let saveLocation = validated.save_location;
      
      // If no save location specified but input was a file path, save to the same file
      if (!saveLocation && imageValidation.originalFilePath) {
        saveLocation = imageValidation.originalFilePath;
        logger.info(`Saving enhanced image back to original location: ${saveLocation}`);
      }

      // Process batch if needed
      const results: Array<TextContent | ImageContent> = [];
      
      for (let i = 0; i < validated.batch_size; i++) {
        if (validated.batch_size > 1) {
          logger.info(`Processing image ${i + 1} of ${validated.batch_size}`);
        }

        // Prepare model-specific parameters
        const modelParams = await this.prepareModelParameters(validated, model, imageValidation);

        // Validate model parameters
        const paramValidation = modelRegistry.validateModelParameters(model.id, modelParams);
        if (!paramValidation.success) {
          return {
            content: [{
              type: 'text',
              text: `Invalid parameters for model ${model.id}: ${paramValidation.error}`,
            } as TextContent],
            isError: true,
          };
        }

        // Execute enhancement
        const result = await this.callModel(model, paramValidation.data, saveLocation);
        results.push(...result.content);
      }

      // Add operation summary
      results.push({
        type: 'text',
        text: this.generateSummary(validated, model),
      } as TextContent);

      return { content: results };

    } catch (error) {
      logger.error('Image enhancement failed', { error });
      return this.createErrorResponse(error);
    }
  }

  private selectModel(params: EnhanceImageParams) {
    // If model is specified, validate it
    if (params.model) {
      const model = modelRegistry.getModel(params.model);
      if (model && model.category === ModelCategory.IMAGE_ENHANCEMENT) {
        return model;
      }
      logger.warn(`Model ${params.model} not found or not an enhancement model`);
    }

    // Get enhancement models
    const enhancementModels = modelRegistry.getModelsByCategory(ModelCategory.IMAGE_ENHANCEMENT);
    
    // Select based on operation
    switch (params.operation) {
      case 'upscale':
        return enhancementModels.find(m => m.id === 'esrgan') || enhancementModels[0];
      
      case 'remove_background':
        return enhancementModels.find(m => m.id === 'bg-removal') || enhancementModels[0];
      
      case 'restore':
        // Would select face restoration model if available
        return enhancementModels.find(m => m.id === 'face-restoration') || 
               enhancementModels.find(m => m.id === 'esrgan') || 
               enhancementModels[0];
      
      case 'colorize':
        // Would select colorization model if available
        return enhancementModels.find(m => m.id === 'colorization') || enhancementModels[0];
      
      case 'denoise':
        // Would select denoising model if available
        return enhancementModels.find(m => m.id === 'denoising') || 
               enhancementModels.find(m => m.id === 'esrgan') || 
               enhancementModels[0];
      
      default:
        return enhancementModels[0];
    }
  }

  private async prepareModelParameters(
    params: EnhanceImageParams, 
    model: any,
    imageValidation: any
  ): Promise<any> {
    const baseParams: any = {
      image: await this.processImageInput(params.image, imageValidation),
    };

    // Model-specific parameter mapping
    switch (model.id) {
      case 'esrgan':
        baseParams.scale = parseInt(params.scale, 10);  // Convert string to number
        baseParams.face_enhance = params.face_enhance;
        break;
      
      case 'bg-removal':
        baseParams.return_mask = params.return_mask;
        baseParams.alpha_matting = params.alpha_matting;
        break;
      
      default:
        // Generic enhancement parameters
        if (params.operation === 'upscale' && model.parameters.shape.scale) {
          baseParams.scale = params.scale;
        }
        if (params.operation === 'denoise' && model.parameters.shape.denoise_strength) {
          baseParams.denoise_strength = params.denoise_strength;
        }
        break;
    }
    
    // Set base64 to false to get binary response
    // Our API client will handle the conversion to base64
    if (model.parameters.shape.base64 !== undefined) {
      baseParams.base64 = false;
    }

    // Merge with model defaults
    return this.mergeWithDefaults(baseParams, model);
  }

  private async validateImageInput(input: string): Promise<{ isValid: boolean; error?: string; format?: string; cacheId?: string; originalFilePath?: string }> {
    // Check if it's a file path (absolute path on any OS)
    const isFilePath = (
      input.match(/^[A-Za-z]:\\/) || // Windows path like C:\
      input.startsWith('/') ||        // Unix absolute path
      input.startsWith('~/')           // Home directory path
    );
    
    if (isFilePath) {
      try {
        // Expand home directory if needed
        let filePath = input;
        if (input.startsWith('~/')) {
          filePath = input.replace('~', process.env.HOME || process.env.USERPROFILE || '');
        }
        
        // Make sure it's absolute
        if (!path.isAbsolute(filePath)) {
          return {
            isValid: false,
            error: 'File path must be absolute',
          };
        }
        
        // Check if file exists
        await fs.access(filePath);
        
        // Read and convert to base64
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const imageBuffer = await fs.readFile(filePath);
        const base64String = imageBuffer.toString('base64');
        
        // Get mime type from extension
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.bmp': 'image/bmp',
        };
        
        const mimeType = mimeTypes[ext] || 'image/png';
        
        // Store in cache to avoid passing large strings
        const cacheId = imageCache.store(base64String, mimeType, filePath);
        
        logger.info(`Automatically converted file path to cache ID: ${cacheId}`);
        
        return {
          isValid: true,
          format: 'cached',
          cacheId,
          originalFilePath: filePath,
        };
      } catch (error) {
        return {
          isValid: false,
          error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    }
    
    // Check if it's an image cache ID
    if (input.startsWith('img_')) {
      const cachedImage = imageCache.get(input);
      if (cachedImage) {
        return {
          isValid: true,
          format: 'cached',
          cacheId: input,
        };
      }
      return {
        isValid: false,
        error: `Image cache ID ${input} not found or expired. Please use prepare_image again.`,
      };
    }

    // Check if it's a URL
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return { isValid: true, format: 'url' };
    }

    // Check if it's base64
    const base64Regex = /^data:image\/(png|jpeg|jpg|webp);base64,/;
    if (input.match(base64Regex) || this.isValidBase64(input)) {
      // Check size for enhancement operations (they can be resource intensive)
      try {
        const base64Data = input.includes(',') ? input.split(',')[1] : input;
        const buffer = Buffer.from(base64Data || '', 'base64');
        
        // Max 20MB for enhancement operations
        if (buffer.length > 20 * 1024 * 1024) {
          return {
            isValid: false,
            error: 'Image size exceeds 20MB limit for enhancement operations',
          };
        }
        
        return { isValid: true, format: 'base64' };
      } catch {
        return {
          isValid: false,
          error: 'Invalid base64 image data',
        };
      }
    }

    return {
      isValid: false,
      error: 'Image must be a valid URL, base64 encoded string, or image cache ID from prepare_image',
    };
  }

  private isValidBase64(str: string): boolean {
    try {
      Buffer.from(str, 'base64');
      return true;
    } catch {
      return false;
    }
  }

  private async processImageInput(input: string, validation: any): Promise<string> {
    // If it's a cached image, retrieve it
    if (validation.format === 'cached' && validation.cacheId) {
      const cachedImage = imageCache.get(validation.cacheId);
      if (cachedImage) {
        // Return plain base64 without data URI prefix for Segmind API
        return cachedImage.base64;
      }
      throw new Error(`Image cache ID ${validation.cacheId} not found`);
    }

    // If it's already a URL, return as-is
    if (input.startsWith('http')) {
      return input;
    }

    // If it's base64 with data URI, strip the prefix for Segmind API
    if (input.startsWith('data:image/')) {
      const base64Part = input.split(',')[1];
      return base64Part || input;
    }

    // If it's already plain base64, return as-is
    return input;
  }

  private generateSummary(params: EnhanceImageParams, model: any): string {
    const operations: Record<string, string> = {
      upscale: `Upscaled ${params.scale}x${params.face_enhance ? ' with face enhancement' : ''}`,
      restore: 'Restored and enhanced image quality',
      remove_background: `Removed background${params.return_mask ? ' (with mask)' : ''}${params.alpha_matting ? ' using alpha matting' : ''}`,
      colorize: 'Colorized black and white image',
      denoise: `Denoised with strength ${params.denoise_strength}`,
    };

    const operationText = operations[params.operation] || params.operation;
    
    return `\nEnhancement complete:
- Operation: ${operationText}
- Model: ${model.name}
- Batch Size: ${params.batch_size}${params.batch_size > 1 ? ' images' : ' image'}`;
  }
}

export const enhanceImageTool = new EnhanceImageTool();