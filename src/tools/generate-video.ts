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

      // Show generation started message
      logger.info('Starting video generation', {
        model: model.id,
        duration: validated.duration,
        estimatedTime: model.estimatedTime,
      });

      // Execute video generation (handle long-running operation)
      const result = await this.handleLongRunningOperation(model, paramValidation.data);
      
      // Format response
      const content: TextContent[] = [];
      
      // Add main result
      if (result.content[0]) {
        content.push(result.content[0] as TextContent);
      }

      // Add generation details
      content.push({
        type: 'text',
        text: `\nVideo generated successfully:
- Model: ${model.name}
- Duration: ${validated.duration}s at ${validated.fps}fps
- Aspect Ratio: ${validated.aspect_ratio}
- Quality: ${validated.quality}
- Processing Time: ${(result.processingTime / 1000).toFixed(1)}s
- Credits Used: ${result.creditsUsed}`,
      } as TextContent);

      return { content };

    } catch (error) {
      logger.error('Video generation failed', { error });
      return this.createErrorResponse(error);
    }
  }

  private selectModel(params: GenerateVideoParams, isImageToVideo: boolean) {
    // If model is specified, use it
    if (params.model) {
      const model = modelRegistry.getModel(params.model);
      if (model && model.category === ModelCategory.VIDEO_GENERATION) {
        return model;
      }
      logger.warn(`Model ${params.model} not found or not a video generation model`);
    }

    // Get video models
    const videoModels = modelRegistry.getModelsByCategory(ModelCategory.VIDEO_GENERATION);
    
    if (isImageToVideo) {
      // Prefer Kling AI for image-to-video
      return videoModels.find(m => m.id === 'kling-video') || videoModels[0];
    } else {
      // Prefer Veo 2 for text-to-video
      return videoModels.find(m => m.id === 'veo-2') || videoModels[0];
    }
  }

  private async prepareModelParameters(
    params: GenerateVideoParams, 
    model: any
  ): Promise<any> {
    const baseParams: any = {};

    // Handle different model types
    if (model.id === 'kling-video') {
      // Kling AI is image-to-video
      if (!params.image) {
        throw new Error('Kling AI requires an input image for video generation');
      }
      
      baseParams.image = await this.processImageInput(params.image);
      baseParams.motion_prompt = params.prompt;
      baseParams.duration = params.duration;
      baseParams.fps = params.fps;
      
      if (params.motion_strength !== undefined) {
        baseParams.motion_strength = params.motion_strength;
      }
    } else if (model.id === 'veo-2') {
      // Veo 2 is text-to-video
      baseParams.prompt = params.prompt;
      baseParams.duration = params.duration;
      baseParams.fps = params.fps;
      baseParams.aspect_ratio = params.aspect_ratio;
      baseParams.quality = params.quality;
    } else {
      // Generic video model
      baseParams.prompt = params.prompt;
      
      if (params.image && model.parameters.shape.image) {
        baseParams.image = await this.processImageInput(params.image);
      }
      
      if (model.parameters.shape.duration) {
        baseParams.duration = params.duration;
      }
      
      if (model.parameters.shape.fps) {
        baseParams.fps = params.fps;
      }
    }

    // Add seed if provided and supported
    if (params.seed !== undefined && model.parameters.shape.seed) {
      baseParams.seed = params.seed;
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