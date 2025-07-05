import { CallToolResult, TextContent, ImageContent } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { modelRegistry, ModelCategory } from '../models/registry.js';
import { logger } from '../utils/logger.js';

import { BaseTool } from './base.js';

const GenerateMusicSchema = z.object({
  prompt: z.string().describe('Text description of the music to generate'),
  model: z.string().optional().describe('Music generation model to use'),
  duration: z.number().min(1).max(300).optional().describe('Duration in seconds for the music'),
  negative_prompt: z.string().optional().describe('What to avoid in the generation'),
  seed: z.number().int().optional().describe('Seed for reproducible generation'),
  num_outputs: z.number().int().min(1).max(4).default(1).describe('Number of variations to generate'),
  save_location: z.string().optional().describe('Directory path to save the music. Overrides default save location.'),
});

type GenerateMusicParams = z.infer<typeof GenerateMusicSchema>;

export class GenerateMusicTool extends BaseTool {
  protected readonly name = 'generate_music';
  protected readonly description = 'Generate music from text descriptions';

  async execute(params: any): Promise<CallToolResult> {
    try {
      // Validate parameters
      const validated = GenerateMusicSchema.parse(params);
      
      // Select appropriate model
      const model = this.selectModel(validated);
      if (!model) {
        return {
          content: [{
            type: 'text',
            text: 'No suitable music generation model found.',
          } as TextContent],
          isError: true,
        };
      }

      logger.info(`Selected music model ${model.id} for generation`);

      // Generate multiple outputs if requested
      const results: Array<TextContent | ImageContent> = [];
      
      for (let i = 0; i < validated.num_outputs; i++) {
        if (validated.num_outputs > 1) {
          logger.info(`Generating variation ${i + 1} of ${validated.num_outputs}`);
        }

        // Prepare model-specific parameters
        const modelParams = await this.prepareModelParameters(validated, model, i);

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

        // Execute generation
        const result = await this.callModel(model, paramValidation.data, validated.save_location);
        results.push(...result.content);
      }

      // Add generation summary
      results.push({
        type: 'text',
        text: `\nGenerated ${validated.num_outputs} ${validated.duration || 30}-second music track${validated.num_outputs > 1 ? 's' : ''} using ${model.name}`,
      } as TextContent);

      return { content: results };

    } catch (error) {
      logger.error('Music generation failed', { error });
      return this.createErrorResponse(error);
    }
  }

  private selectModel(params: GenerateMusicParams) {
    // If model is specified, validate it
    if (params.model) {
      const model = modelRegistry.getModel(params.model);
      if (model && model.category === ModelCategory.TEXT_TO_MUSIC) {
        return model;
      }
      logger.warn(`Model ${params.model} not found or not a music model`);
    }

    // Get music models
    const musicModels = modelRegistry.getModelsByCategory(ModelCategory.TEXT_TO_MUSIC);
    
    // DEFAULT: Always use the cheapest model (lyria-2 at 0.5 credits)
    // minimax-music costs 0.8 credits (60% more expensive)
    // Only use minimax-music if user explicitly asks for it or needs longer than 30 seconds
    if (params.duration && params.duration > 30) {
      // Lyria-2 only supports up to 30 seconds, so use minimax-music for longer
      return musicModels.find(m => m.id === 'minimax-music') || musicModels[0];
    }
    
    // Default to lyria-2 for all standard use cases
    return musicModels.find(m => m.id === 'lyria-2') || musicModels[0];
  }

  private async prepareModelParameters(
    params: GenerateMusicParams, 
    model: any,
    variationIndex: number
  ): Promise<any> {
    const baseParams: any = {
      prompt: params.prompt,
    };

    // Add variation to seed if generating multiple
    const seed = params.seed !== undefined 
      ? params.seed + variationIndex 
      : undefined;

    // Model-specific parameter mapping
    switch (model.id) {
      case 'lyria-2':
        if (params.duration) baseParams.duration = params.duration;
        if (params.negative_prompt) baseParams.negative_prompt = params.negative_prompt;
        break;
        
      case 'minimax-music':
        if (params.duration) baseParams.duration = params.duration;
        break;
    }

    // Add seed if provided and supported
    if (seed !== undefined && model.parameters.shape.seed) {
      baseParams.seed = seed;
    }
    
    // Set base64 to false for audio to get binary response
    if (model.parameters.shape.base64 !== undefined) {
      baseParams.base64 = false;
    }

    // Merge with model defaults
    return this.mergeWithDefaults(baseParams, model);
  }
}

export const generateMusicTool = new GenerateMusicTool();