import { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';


import { modelRegistry, ModelCategory } from '../models/registry.js';
import { logger } from '../utils/logger.js';

import { BaseTool } from './base.js';

const GenerateVideoSchema = z.object({
  prompt: z.string().min(1).max(2000).describe('Text prompt or motion description for video generation'),
  model: z.string().optional().describe('Model ID to use for video generation'),
  image: z.string().optional().describe('Input image for image-to-video generation (base64 or URL)'),
  duration: z.number().min(1).max(30).default(5).describe('Video duration in seconds'),
  fps: z.number().int().min(12).max(60).default(24).describe('Frames per second'),
  aspect_ratio: z.enum(['16:9', '9:16', '1:1', '4:3']).default('16:9').describe('Video aspect ratio'),
  quality: z.enum(['standard', 'high', 'ultra']).default('high').describe('Video quality preset'),
  motion_strength: z.number().min(0).max(1).optional().describe('Motion intensity for image-to-video'),
  seed: z.number().int().optional().describe('Seed for reproducible generation'),
  save_location: z.string().optional().describe('Directory path to save the video. Overrides default save location.'),
});

type GenerateVideoParams = z.infer<typeof GenerateVideoSchema>;

export class GenerateVideoTool extends BaseTool {
  protected readonly name = 'generate_video';
  protected readonly description = 'Generate videos from text prompts or animate static images';

  async execute(params: any): Promise<CallToolResult> {
    try {
      // Validate parameters
      const validated = GenerateVideoSchema.parse(params);
      
      // Determine generation type
      const isImageToVideo = !!validated.image;
      
      // Select appropriate model
      const model = this.selectModel(validated, isImageToVideo);
      if (!model) {
        return {
          content: [{
            type: 'text',
            text: 'No suitable model found for video generation.',
          } as TextContent],
          isError: true,
        };
      }

      logger.info(`Selected model ${model.id} for video generation`, {
        type: isImageToVideo ? 'image-to-video' : 'text-to-video',
      });

      // Validate image input if provided
      if (validated.image) {
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
      }

      // Prepare model-specific parameters
      const modelParams = await this.prepareModelParameters(validated, model);

      // Log the parameters being sent
      logger.info('Video generation parameters', {
        model: model.id,
        originalParams: validated,
        preparedParams: modelParams,
      });

      // Validate model parameters
      const paramValidation = modelRegistry.validateModelParameters(model.id, modelParams);
      if (!paramValidation.success) {
        logger.error('Parameter validation failed', {
          model: model.id,
          params: modelParams,
          error: paramValidation.error,
        });
        return {
          content: [{
            type: 'text',
            text: `Invalid parameters for model ${model.id}: ${paramValidation.error}`,
          } as TextContent],
          isError: true,
        };
      }

      // Show generation started message
      logger.info('Starting video generation', {
        model: model.id,
        duration: validated.duration,
        estimatedTime: model.estimatedTime,
      });

      // Execute video generation
      const result = await this.callModel(model, paramValidation.data, validated.save_location);
      
      // Return the result directly - the base class handles formatting
      return { content: result.content };

    } catch (error) {
      logger.error('Video generation failed', { error });
      return this.createErrorResponse(error);
    }
  }

  private selectModel(params: GenerateVideoParams, isImageToVideo: boolean) {
    // If model is specified, use it
    if (params.model) {
      const model = modelRegistry.getModel(params.model);
      if (model && model.category === ModelCategory.TEXT_TO_VIDEO) {
        return model;
      }
      logger.warn(`Model ${params.model} not found or not a video generation model`);
    }

    // Get video models
    const videoModels = modelRegistry.getModelsByCategory(ModelCategory.TEXT_TO_VIDEO);
    
    if (isImageToVideo) {
      // We don't have image-to-video models yet, return first available
      return videoModels[0];
    } else {
      // DEFAULT: Always use the cheapest model (seedance-v1-lite at 0.45 credits)
      // veo-3 costs 2.0 credits (4x more expensive!)
      // Only use veo-3 if user explicitly asks for it
      return videoModels.find(m => m.id === 'seedance-v1-lite') || videoModels[0];
    }
  }

  private async prepareModelParameters(
    params: GenerateVideoParams, 
    model: any
  ): Promise<any> {
    const baseParams: any = {};

    // Handle different model types based on actual models we have
    if (model.id === 'veo-3') {
      // Veo 3 accepts prompt, seed, generate_audio, and aspect_ratio
      baseParams.prompt = params.prompt;
      
      if (params.seed !== undefined) {
        baseParams.seed = params.seed;
      }
      
      // Veo 3 supports aspect ratio
      if (params.aspect_ratio) {
        baseParams.aspect_ratio = params.aspect_ratio;
      }
      
      // Note: Veo 3 does NOT support duration control
      // It generates videos of a fixed length
    } else if (model.id === 'seedance-v1-lite') {
      // Seedance V1 Lite accepts more parameters
      baseParams.prompt = params.prompt;
      
      // Map duration (within model's 5-10 second range)
      if (params.duration !== undefined) {
        baseParams.duration = Math.min(Math.max(params.duration, 5), 10);
      }
      
      // Map aspect_ratio if it's one of the supported values
      const supportedAspectRatios = ['16:9', '4:3', '1:1', '3:4', '9:16'];
      if (params.aspect_ratio && supportedAspectRatios.includes(params.aspect_ratio)) {
        baseParams.aspect_ratio = params.aspect_ratio;
      }
      
      // Map quality to resolution (seedance uses resolution, not quality)
      if (model.parameters.shape.resolution) {
        if (params.quality === 'standard') {
          baseParams.resolution = '480p';
        } else {
          baseParams.resolution = '720p';
        }
      }
      
      if (params.seed !== undefined && model.parameters.shape.seed) {
        baseParams.seed = params.seed;
      }
    } else {
      // Generic fallback - only pass parameters that exist in the model schema
      baseParams.prompt = params.prompt;
      
      if (params.image && model.parameters.shape.image) {
        baseParams.image = await this.processImageInput(params.image);
      }
      
      // Only add parameters that are actually defined in the model's schema
      const modelShape = model.parameters.shape;
      
      if (params.duration !== undefined && modelShape.duration) {
        baseParams.duration = params.duration;
      }
      
      if (params.fps !== undefined && modelShape.fps) {
        baseParams.fps = params.fps;
      }
      
      if (params.aspect_ratio !== undefined && modelShape.aspect_ratio) {
        baseParams.aspect_ratio = params.aspect_ratio;
      }
      
      if (params.seed !== undefined && modelShape.seed) {
        baseParams.seed = params.seed;
      }
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
      return { isValid: true };
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

  private async processImageInput(input: string): Promise<string> {
    // If it's already a URL or data URI, return as-is
    if (input.startsWith('http') || input.startsWith('data:image/')) {
      return input;
    }

    // If it's plain base64, add data URI prefix
    return `data:image/png;base64,${input}`;
  }
}

export const generateVideoTool = new GenerateVideoTool();