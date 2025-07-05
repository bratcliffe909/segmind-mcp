import { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';


import { modelRegistry, ModelCategory } from '../models/registry.js';
import { logger } from '../utils/logger.js';

import { BaseTool } from './base.js';

const GenerateImageSchema = z.object({
  prompt: z.string().min(1).max(4000).describe('Text prompt describing the image to generate'),
  model: z.string().optional().describe('Model ID to use for generation'),
  negative_prompt: z.string().optional().describe('What to avoid in the generation'),
  width: z.number().int().multipleOf(8).min(256).max(2048).optional().describe('Image width'),
  height: z.number().int().multipleOf(8).min(256).max(2048).optional().describe('Image height'),
  num_images: z.number().int().min(1).max(4).default(1).describe('Number of images to generate'),
  seed: z.number().int().optional().describe('Seed for reproducible generation'),
  quality: z.enum(['draft', 'standard', 'high']).default('standard').describe('Quality preset'),
  style: z.string().optional().describe('Style modifier (e.g., "photorealistic", "anime", "oil painting")'),
  save_location: z.string().optional().describe('Directory path to save the image(s). Overrides default save location.'),
});

type GenerateImageParams = z.infer<typeof GenerateImageSchema>;

export class GenerateImageTool extends BaseTool {
  protected readonly name = 'generate_image';
  protected readonly description = 'Generate images from text prompts using various AI models';

  async execute(params: any): Promise<CallToolResult> {
    try {
      // Validate parameters
      const validated = GenerateImageSchema.parse(params);
      
      // Select model
      const model = this.selectModel(validated);
      if (!model) {
        return {
          content: [{
            type: 'text',
            text: 'No suitable model found for image generation.',
          }],
          isError: true,
        };
      }

      logger.info(`Selected model ${model.id} for image generation`);

      // Prepare model-specific parameters
      const modelParams = this.prepareModelParameters(validated, model);

      // Validate model parameters
      const paramValidation = modelRegistry.validateModelParameters(model.id, modelParams);
      if (!paramValidation.success) {
        return {
          content: [{
            type: 'text',
            text: `Invalid parameters for model ${model.id}: ${paramValidation.error}`,
          }],
          isError: true,
        };
      }

      // Generate images
      const results = [];
      for (let i = 0; i < validated.num_images; i++) {
        logger.info(`Generating image ${i + 1} of ${validated.num_images}`);
        
        const result = await this.callModel(model, paramValidation.data, validated.save_location);
        results.push(...result.content);
      }

      // Add metadata
      results.push({
        type: 'text',
        text: `\nGenerated ${validated.num_images} image(s) using ${model.name}`,
      } as TextContent);

      return { content: results };

    } catch (error) {
      logger.error('Image generation failed', { error });
      return this.createErrorResponse(error);
    }
  }

  private selectModel(params: GenerateImageParams) {
    // If model is specified, use it
    if (params.model) {
      const model = modelRegistry.getModel(params.model);
      if (model && model.category === ModelCategory.TEXT_TO_IMAGE) {
        return model;
      }
      logger.warn(`Model ${params.model} not found or not a text-to-image model`);
    }

    // Otherwise, select based on requirements
    const t2iModels = modelRegistry.getModelsByCategory(ModelCategory.TEXT_TO_IMAGE);
    
    // Special case: if user explicitly requests high quality, use a better model
    if (params.quality === 'high') {
      // Use SDXL for high quality (0.3 credits vs 0.2 for lightning)
      return t2iModels.find(m => m.id === 'sdxl') || t2iModels[0];
    }
    
    // Special case: Fooocus has specific style presets that might be needed
    if (params.style?.includes('anime') || params.style?.includes('enhance')) {
      // Fooocus has built-in style support but costs 0.4 credits
      // Only use if specifically requested
      return t2iModels.find(m => m.id === 'fooocus') || t2iModels.find(m => m.id === 'sdxl-lightning') || t2iModels[0];
    }

    // DEFAULT: Always use the cheapest model (sdxl-lightning at 0.2 credits)
    // This saves users money unless they explicitly need specific features
    return t2iModels.find(m => m.id === 'sdxl-lightning') || t2iModels[0];
  }

  private prepareModelParameters(params: GenerateImageParams, model: any): any {
    const baseParams: any = {
      prompt: this.enhancePrompt(params.prompt, params.style),
    };

    // Add negative prompt if supported
    if (params.negative_prompt && model.parameters.shape.negative_prompt) {
      baseParams.negative_prompt = params.negative_prompt;
    }

    // Handle dimensions
    if (model.id === 'fooocus') {
      // Fooocus uses aspect_ratio parameter
      baseParams.aspect_ratio = this.mapToFoocusAspectRatio(params.width, params.height);
    } else {
      // Most models use width/height but some use img_width/img_height
      if (params.width) {
        if (model.parameters.shape.img_width) {
          baseParams.img_width = params.width;
        } else {
          baseParams.width = params.width;
        }
      }
      if (params.height) {
        if (model.parameters.shape.img_height) {
          baseParams.img_height = params.height;
        } else {
          baseParams.height = params.height;
        }
      }
    }

    // Map quality to model-specific parameters
    switch (params.quality) {
      case 'draft':
        if (model.parameters.shape.num_inference_steps) {
          baseParams.num_inference_steps = Math.max(10, (model.defaultParams?.num_inference_steps || 30) / 3);
        }
        if (model.parameters.shape.steps) {
          baseParams.steps = Math.max(20, 30 / 2);  // Fooocus min is 20
        }
        break;
      case 'high':
        if (model.parameters.shape.num_inference_steps) {
          baseParams.num_inference_steps = Math.min(150, (model.defaultParams?.num_inference_steps || 30) * 2);
        }
        if (model.parameters.shape.steps) {
          baseParams.steps = Math.min(100, 30 * 2);  // Fooocus max is 100
        }
        if (model.parameters.shape.quality) {
          baseParams.quality = 'hd';
        }
        break;
    }

    // Add seed if provided
    if (params.seed !== undefined && model.parameters.shape.seed) {
      baseParams.seed = params.seed;
    }

    // Set base64 to false to get binary response
    // Our API client will handle the conversion to base64
    if (model.parameters.shape.base64 !== undefined) {
      baseParams.base64 = false;
    }
    
    // Merge with model defaults
    return this.mergeWithDefaults(baseParams, model);
  }

  private enhancePrompt(prompt: string, style?: string): string {
    if (!style) return prompt;
    
    // Add style modifier to prompt if not already present
    const styleKeywords = style.toLowerCase().split(' ');
    const promptLower = prompt.toLowerCase();
    
    const missingKeywords = styleKeywords.filter(
      keyword => !promptLower.includes(keyword)
    );
    
    if (missingKeywords.length > 0) {
      return `${prompt}, ${missingKeywords.join(' ')} style`;
    }
    
    return prompt;
  }


  private mapToFoocusAspectRatio(width?: number, height?: number): string {
    // Fooocus uses format like "1024*1024" instead of ratios
    if (!width || !height) return '1024*1024';
    
    // Common Fooocus aspect ratios
    if (width === 1024 && height === 1024) return '1024*1024';
    if (width === 1152 && height === 896) return '1152*896';
    if (width === 896 && height === 1152) return '896*1152';
    if (width === 1216 && height === 832) return '1216*832';
    if (width === 832 && height === 1216) return '832*1216';
    if (width === 1344 && height === 768) return '1344*768';
    if (width === 768 && height === 1344) return '768*1344';
    
    // Default to requested size or 1024*1024
    return `${width || 1024}*${height || 1024}`;
  }
}

export const generateImageTool = new GenerateImageTool();