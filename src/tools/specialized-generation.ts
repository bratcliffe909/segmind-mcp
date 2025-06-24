import { z } from 'zod';
import { CallToolResult, TextContent, ImageContent } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool } from './base.js';
import { modelRegistry, ModelCategory } from '../models/registry.js';
import { logger } from '../utils/logger.js';

const SpecializedGenerationSchema = z.object({
  type: z.enum(['qr_code', 'sticker', 'avatar', 'outfit', 'logo']).describe('Type of specialized content to generate'),
  model: z.string().optional().describe('Specific model to use'),
  
  // QR Code parameters
  qr_text: z.string().optional().describe('Text/URL to encode in QR code'),
  qr_prompt: z.string().optional().describe('Artistic style prompt for QR code'),
  qr_code_strength: z.number().min(0.5).max(1.5).default(0.9).describe('QR code visibility strength'),
  
  // Sticker parameters
  sticker_image: z.string().optional().describe('Input image for sticker generation (base64 or URL)'),
  sticker_style: z.enum(['cartoon', 'anime', 'pixel', 'sketch']).default('cartoon').describe('Sticker art style'),
  
  // Avatar parameters
  avatar_image: z.string().optional().describe('Input image for avatar generation'),
  avatar_style: z.enum(['realistic', 'cartoon', 'anime', 'cyberpunk']).default('realistic').describe('Avatar style'),
  
  // Outfit parameters
  outfit_prompt: z.string().optional().describe('Description of outfit to generate'),
  outfit_type: z.enum(['casual', 'formal', 'sportswear', 'costume']).default('casual').describe('Type of outfit'),
  
  // Logo parameters
  logo_text: z.string().optional().describe('Company/brand name for logo'),
  logo_style: z.enum(['modern', 'vintage', 'minimalist', 'abstract']).default('modern').describe('Logo design style'),
  logo_colors: z.array(z.string()).optional().describe('Preferred colors for logo'),
  
  // Common parameters
  prompt: z.string().optional().describe('General description or style instructions'),
  negative_prompt: z.string().optional().describe('What to avoid in generation'),
  seed: z.number().int().optional().describe('Seed for reproducible generation'),
  num_outputs: z.number().int().min(1).max(4).default(1).describe('Number of variations to generate'),
});

type SpecializedGenerationParams = z.infer<typeof SpecializedGenerationSchema>;

export class SpecializedGenerationTool extends BaseTool {
  protected readonly name = 'specialized_generation';
  protected readonly description = 'Generate specialized content like QR codes, stickers, avatars, outfits, and logos';

  async execute(params: any): Promise<CallToolResult> {
    try {
      // Validate parameters
      const validated = SpecializedGenerationSchema.parse(params);
      
      // Validate type-specific requirements
      const validationResult = this.validateTypeRequirements(validated);
      if (!validationResult.isValid) {
        return {
          content: [{
            type: 'text',
            text: validationResult.error!,
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
            text: `No suitable model found for ${validated.type} generation.`,
          } as TextContent],
          isError: true,
        };
      }

      logger.info(`Selected model ${model.id} for ${validated.type} generation`);

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
        const result = await this.callModel(model, paramValidation.data);
        results.push(...result.content);
      }

      // Add generation summary
      results.push({
        type: 'text',
        text: this.generateSummary(validated, model),
      } as TextContent);

      return { content: results };

    } catch (error) {
      logger.error('Specialized generation failed', { error });
      return this.createErrorResponse(error);
    }
  }

  private validateTypeRequirements(params: SpecializedGenerationParams): { isValid: boolean; error?: string } {
    switch (params.type) {
      case 'qr_code':
        if (!params.qr_text) {
          return { isValid: false, error: 'QR code generation requires qr_text parameter' };
        }
        if (!params.qr_prompt && !params.prompt) {
          return { isValid: false, error: 'QR code generation requires qr_prompt or prompt parameter for styling' };
        }
        break;
      
      case 'sticker':
        if (!params.sticker_image) {
          return { isValid: false, error: 'Sticker generation requires sticker_image parameter' };
        }
        break;
      
      case 'avatar':
        if (!params.avatar_image && !params.prompt) {
          return { isValid: false, error: 'Avatar generation requires avatar_image or prompt parameter' };
        }
        break;
      
      case 'outfit':
        if (!params.outfit_prompt && !params.prompt) {
          return { isValid: false, error: 'Outfit generation requires outfit_prompt or prompt parameter' };
        }
        break;
      
      case 'logo':
        if (!params.logo_text) {
          return { isValid: false, error: 'Logo generation requires logo_text parameter' };
        }
        break;
    }
    
    return { isValid: true };
  }

  private selectModel(params: SpecializedGenerationParams) {
    // If model is specified, validate it
    if (params.model) {
      const model = modelRegistry.getModel(params.model);
      if (model && model.category === ModelCategory.SPECIALIZED_GENERATION) {
        return model;
      }
      logger.warn(`Model ${params.model} not found or not a specialized model`);
    }

    // Get specialized models
    const specializedModels = modelRegistry.getModelsByCategory(ModelCategory.SPECIALIZED_GENERATION);
    
    // Select based on type
    switch (params.type) {
      case 'qr_code':
        return specializedModels.find(m => m.id === 'qr-generator') || specializedModels[0];
      
      case 'sticker':
        return specializedModels.find(m => m.id === 'face-to-sticker') || specializedModels[0];
      
      case 'avatar':
        // Would use 3d-avatar-generation model if available
        return specializedModels.find(m => m.id === '3d-avatar') || specializedModels[0];
      
      case 'outfit':
        // Would use outfit-generator model if available
        return specializedModels.find(m => m.id === 'outfit-generator') || specializedModels[0];
      
      case 'logo':
        // Would use logo-generator model if available
        return specializedModels.find(m => m.id === 'logo-generator') || specializedModels[0];
      
      default:
        return specializedModels[0];
    }
  }

  private async prepareModelParameters(
    params: SpecializedGenerationParams, 
    model: any,
    variationIndex: number
  ): Promise<any> {
    const baseParams: any = {};

    // Add variation to seed if generating multiple
    const seed = params.seed !== undefined 
      ? params.seed + variationIndex 
      : undefined;

    // Model-specific parameter mapping
    switch (model.id) {
      case 'qr-generator':
        baseParams.qr_text = params.qr_text;
        baseParams.prompt = params.qr_prompt || params.prompt || 'artistic QR code design';
        baseParams.qr_code_strength = params.qr_code_strength;
        if (params.negative_prompt) {
          baseParams.negative_prompt = params.negative_prompt;
        }
        break;
      
      case 'face-to-sticker':
        if (params.sticker_image) {
          baseParams.image = await this.processImageInput(params.sticker_image);
        }
        baseParams.style = params.sticker_style;
        break;
      
      default:
        // Generic specialized model parameters
        if (params.prompt) {
          baseParams.prompt = this.buildPromptForType(params);
        }
        
        // Handle image inputs
        if (params.sticker_image && model.parameters.shape.image) {
          baseParams.image = await this.processImageInput(params.sticker_image);
        } else if (params.avatar_image && model.parameters.shape.image) {
          baseParams.image = await this.processImageInput(params.avatar_image);
        }
        
        if (params.negative_prompt && model.parameters.shape.negative_prompt) {
          baseParams.negative_prompt = params.negative_prompt;
        }
        break;
    }

    // Add seed if provided and supported
    if (seed !== undefined && model.parameters.shape.seed) {
      baseParams.seed = seed;
    }

    // Merge with model defaults
    return this.mergeWithDefaults(baseParams, model);
  }

  private buildPromptForType(params: SpecializedGenerationParams): string {
    if (params.prompt) return params.prompt;

    switch (params.type) {
      case 'outfit':
        return `${params.outfit_type} outfit design: ${params.outfit_prompt}`;
      
      case 'logo':
        const colorInfo = params.logo_colors?.length 
          ? ` using colors: ${params.logo_colors.join(', ')}`
          : '';
        return `${params.logo_style} logo design for "${params.logo_text}"${colorInfo}`;
      
      case 'avatar':
        return `${params.avatar_style} avatar portrait`;
      
      default:
        return 'creative design';
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

  private generateSummary(params: SpecializedGenerationParams, model: any): string {
    const typeDescriptions: Record<string, string> = {
      qr_code: `QR code encoding "${params.qr_text}" with artistic styling`,
      sticker: `${params.sticker_style} style sticker`,
      avatar: `${params.avatar_style || 'custom'} avatar`,
      outfit: `${params.outfit_type} outfit design`,
      logo: `${params.logo_style} logo for "${params.logo_text}"`,
    };

    return `\nGenerated ${params.num_outputs} ${typeDescriptions[params.type] || params.type}${params.num_outputs > 1 ? ' variations' : ''} using ${model.name}`;
  }
}

export const specializedGenerationTool = new SpecializedGenerationTool();