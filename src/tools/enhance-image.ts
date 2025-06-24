import { z } from 'zod';
import { CallToolResult, TextContent, ImageContent } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool } from './base.js';
import { modelRegistry, ModelCategory } from '../models/registry.js';
import { logger } from '../utils/logger.js';

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
        const result = await this.callModel(model, paramValidation.data);
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
        baseParams.scale = params.scale;
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

    // Merge with model defaults
    return this.mergeWithDefaults(baseParams, model);
  }

  private async validateImageInput(input: string): Promise<{ isValid: boolean; error?: string }> {
    // Check if it's a URL
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return { isValid: true };
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
        
        return { isValid: true };
      } catch {
        return {
          isValid: false,
          error: 'Invalid base64 image data',
        };
      }
    }

    return {
      isValid: false,
      error: 'Image must be a valid URL or base64 encoded string',
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

  private async processImageInput(input: string, _validation: any): Promise<string> {
    // If it's already a URL or data URI, return as-is
    if (input.startsWith('http') || input.startsWith('data:image/')) {
      return input;
    }

    // If it's plain base64, add data URI prefix
    return `data:image/png;base64,${input}`;
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