import { CallToolResult, TextContent, ImageContent } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';


import { modelRegistry, ModelCategory } from '../models/registry.js';
import { logger } from '../utils/logger.js';

import { BaseTool } from './base.js';

const TransformImageSchema = z.object({
  image: z.string().describe('Input image as base64 string or URL'),
  prompt: z.string().min(1).max(2000).describe('Transformation prompt describing desired changes'),
  model: z.string().optional().describe('Model ID to use for transformation'),
  negative_prompt: z.string().optional().describe('What to avoid in the transformation'),
  strength: z.number().min(0).max(1).default(0.75).describe('Transformation strength (0=no change, 1=complete change)'),
  mask: z.string().optional().describe('Mask image for inpainting (base64 or URL)'),
  control_type: z.enum(['canny', 'depth', 'pose', 'scribble', 'segmentation']).optional().describe('ControlNet type'),
  control_strength: z.number().min(0).max(2).default(1).describe('Control strength for ControlNet'),
  seed: z.number().int().optional().describe('Seed for reproducible generation'),
  output_format: z.enum(['png', 'jpeg', 'webp']).default('png').describe('Output image format'),
});

type TransformImageParams = z.infer<typeof TransformImageSchema>;

export class TransformImageTool extends BaseTool {
  protected readonly name = 'transform_image';
  protected readonly description = 'Transform existing images using AI models with various control methods';

  async execute(params: any): Promise<CallToolResult> {
    try {
      // Validate parameters
      const validated = TransformImageSchema.parse(params);
      
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

      // Select appropriate model
      const model = this.selectModel(validated);
      if (!model) {
        return {
          content: [{
            type: 'text',
            text: 'No suitable model found for image transformation.',
          } as TextContent],
          isError: true,
        };
      }

      logger.info(`Selected model ${model.id} for image transformation`);

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

      // Execute transformation
      const result = await this.callModel(model, paramValidation.data);
      
      // Add transformation info
      const content: Array<TextContent | ImageContent> = [...result.content];
      content.push({
        type: 'text',
        text: `\nImage transformed using ${model.name} with strength ${validated.strength}`,
      } as TextContent);

      return { content };

    } catch (error) {
      logger.error('Image transformation failed', { error });
      return this.createErrorResponse(error);
    }
  }

  private selectModel(params: TransformImageParams) {
    // If model is specified, use it
    if (params.model) {
      const model = modelRegistry.getModel(params.model);
      if (model && model.category === ModelCategory.IMAGE_TO_IMAGE) {
        return model;
      }
      logger.warn(`Model ${params.model} not found or not an image-to-image model`);
    }

    // Select based on requirements
    const img2imgModels = modelRegistry.getModelsByCategory(ModelCategory.IMAGE_TO_IMAGE);
    
    // If control type is specified, prefer ControlNet
    if (params.control_type) {
      return img2imgModels.find(m => m.id === 'controlnet') || img2imgModels[0];
    }
    
    // If mask is provided, prefer models that support inpainting
    if (params.mask) {
      // Look for models that support masking/inpainting
      return img2imgModels.find(m => m.id === 'flux-kontext-pro') || img2imgModels[0];
    }

    // Default to FLUX Kontext Pro for general transformations
    return img2imgModels.find(m => m.id === 'flux-kontext-pro') || img2imgModels[0];
  }

  private async prepareModelParameters(
    params: TransformImageParams, 
    model: any,
    imageValidation: ImageValidationResult
  ): Promise<any> {
    const baseParams: any = {
      prompt: params.prompt,
      image: await this.processImageInput(params.image, imageValidation),
    };

    // Add common parameters
    if (params.negative_prompt && model.parameters.shape.negative_prompt) {
      baseParams.negative_prompt = params.negative_prompt;
    }

    if (params.seed !== undefined && model.parameters.shape.seed) {
      baseParams.seed = params.seed;
    }

    // Model-specific parameter mapping
    switch (model.id) {
      case 'controlnet':
        if (params.control_type) {
          baseParams.control_type = params.control_type;
        }
        if (params.control_strength !== undefined) {
          baseParams.control_strength = params.control_strength;
        }
        break;

      case 'flux-kontext-pro':
      default:
        if (params.strength !== undefined && model.parameters.shape.strength) {
          baseParams.strength = params.strength;
        }
        break;
    }

    // Handle mask for inpainting
    if (params.mask) {
      const maskValidation = await this.validateImageInput(params.mask);
      if (maskValidation.isValid && model.parameters.shape.mask) {
        baseParams.mask = await this.processImageInput(params.mask, maskValidation);
      }
    }

    // Add output format if supported
    if (model.parameters.shape.output_format) {
      baseParams.output_format = params.output_format;
    }

    // Merge with model defaults
    return this.mergeWithDefaults(baseParams, model);
  }

  private async validateImageInput(input: string): Promise<ImageValidationResult> {
    // Check if it's a URL
    if (input.startsWith('http://') || input.startsWith('https://')) {
      // For now, assume URLs are valid
      // In production, you might want to HEAD request to validate
      return {
        isValid: true,
        format: 'url',
      };
    }

    // Check if it's base64
    const base64Regex = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/;
    const match = input.match(base64Regex);
    
    if (match) {
      try {
        // Validate base64 string
        const base64Data = input.split(',')[1] || '';
        const buffer = Buffer.from(base64Data, 'base64');
        const size = buffer.length;
        
        // Basic size validation (max 10MB)
        if (size > 10 * 1024 * 1024) {
          return {
            isValid: false,
            error: 'Image size exceeds 10MB limit',
          };
        }

        return {
          isValid: true,
          format: 'base64',
          size,
        };
      } catch (error) {
        return {
          isValid: false,
          error: 'Invalid base64 image data',
        };
      }
    }

    // Try plain base64 without data URI prefix
    try {
      const buffer = Buffer.from(input, 'base64');
      if (buffer.length > 0) {
        return {
          isValid: true,
          format: 'base64',
          size: buffer.length,
        };
      }
    } catch {
      // Not valid base64
    }

    return {
      isValid: false,
      error: 'Image must be a valid URL or base64 encoded string',
    };
  }

  private async processImageInput(
    input: string, 
    validation: ImageValidationResult
  ): Promise<string> {
    // If it's already a URL, return as-is
    if (validation.format === 'url') {
      return input;
    }

    // If it's base64 with data URI, return as-is
    if (input.startsWith('data:image/')) {
      return input;
    }

    // If it's plain base64, add data URI prefix
    // Assume PNG if no format specified
    return `data:image/png;base64,${input}`;
  }
}

export const transformImageTool = new TransformImageTool();

// Type definitions for image validation
interface ImageValidationResult {
  isValid: boolean;
  format?: 'url' | 'base64';
  size?: number;
  width?: number;
  height?: number;
  error?: string;
}