import { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { modelRegistry, ModelCategory } from '../models/registry.js';
import { logger } from '../utils/logger.js';

import { BaseTool } from './base.js';

const GenerateAudioSchema = z.object({
  text: z.string().describe('Text to convert to speech'),
  model: z.string().optional().describe('TTS model to use (dia-tts or orpheus-tts)'),
  
  // Common TTS parameters
  voice: z.string().optional().describe('Voice selection for TTS (orpheus: tara, dan, josh, emma)'),
  temperature: z.number().min(0.1).max(2.0).optional().describe('Controls randomness/expressiveness (0.1-2.0)'),
  top_p: z.number().min(0.1).max(1.0).optional().describe('Controls word variety (0.1-1.0, higher = rarer words)'),
  max_new_tokens: z.number().min(100).max(10000).optional().describe('Maximum tokens (controls audio length - higher = longer audio)'),
  
  // Dia-specific parameters
  speed_factor: z.number().min(0.5).max(1.5).optional().describe('Playback speed (0.5-1.5). Default 0.94 = normal speech. Try 0.8 for slower, 1.1 for faster'),
  cfg_scale: z.number().min(1).max(5).optional().describe('How strictly to follow text (1-5, dia only)'),
  cfg_filter_top_k: z.number().min(10).max(100).optional().describe('Token filtering (10-100, dia only)'),
  input_audio: z.string().optional().describe('Base64 audio for voice cloning (dia only)'),
  
  // Orpheus-specific parameters
  repetition_penalty: z.number().min(1.0).max(2.0).optional().describe('Penalty for repeated phrases (1.0-2.0, orpheus only)'),
  
  seed: z.number().int().optional().describe('Seed for reproducible generation'),
  save_location: z.string().optional().describe('Directory path to save the audio. Overrides default save location.'),
});

type GenerateAudioParams = z.infer<typeof GenerateAudioSchema>;

export class GenerateAudioTool extends BaseTool {
  protected readonly name = 'generate_audio';
  protected readonly description = 'Generate speech audio from text using TTS models';

  async execute(params: any): Promise<CallToolResult> {
    try {
      // Validate parameters
      const validated = GenerateAudioSchema.parse(params);
      
      // Select appropriate model
      const model = this.selectModel(validated);
      if (!model) {
        return {
          content: [{
            type: 'text',
            text: 'No suitable TTS model found.',
          } as TextContent],
          isError: true,
        };
      }

      logger.info(`Selected TTS model ${model.id}`, {
        requestedParams: {
          speed_factor: validated.speed_factor,
          temperature: validated.temperature,
          max_new_tokens: validated.max_new_tokens,
        }
      });

      // Prepare model-specific parameters
      const modelParams = await this.prepareModelParameters(validated, model);
      
      logger.info(`Prepared model parameters for ${model.id}`, {
        modelParams,
        hasSpeedFactor: 'speed_factor' in modelParams,
      });

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
      
      // Add generation summary
      result.content.push({
        type: 'text',
        text: `\nGenerated speech audio using ${model.name}`,
      } as TextContent);

      return { content: result.content };

    } catch (error) {
      logger.error('Audio generation failed', { error });
      return this.createErrorResponse(error);
    }
  }

  private selectModel(params: GenerateAudioParams) {
    // If model is specified, validate it
    if (params.model) {
      const model = modelRegistry.getModel(params.model);
      if (model && model.category === ModelCategory.TEXT_TO_AUDIO) {
        return model;
      }
      logger.warn(`Model ${params.model} not found or not a TTS model`);
    }

    // Get TTS models
    const ttsModels = modelRegistry.getModelsByCategory(ModelCategory.TEXT_TO_AUDIO);
    
    // Auto-select based on features needed
    // Use dia-tts ONLY if specific features are required:
    // - speaker tags ([S1], [S2])
    // - speed_factor control
    // - voice cloning (input_audio)
    // - advanced cfg controls
    if ((params.text && params.text.includes('[S')) || 
        params.speed_factor !== undefined || 
        params.input_audio !== undefined ||
        params.cfg_scale !== undefined ||
        params.cfg_filter_top_k !== undefined) {
      return ttsModels.find(m => m.id === 'dia-tts') || ttsModels[0];
    }
    
    // Default to orpheus-tts for simple TTS without special features
    return ttsModels.find(m => m.id === 'orpheus-tts') || ttsModels[0];
  }

  private async prepareModelParameters(
    params: GenerateAudioParams, 
    model: any
  ): Promise<any> {
    const baseParams: any = {
      text: params.text,
    };

    // Model-specific parameter mapping
    switch (model.id) {
      case 'dia-tts':
        if (params.speed_factor !== undefined) baseParams.speed_factor = params.speed_factor;
        if (params.top_p !== undefined) baseParams.top_p = params.top_p;
        if (params.temperature !== undefined) baseParams.temperature = params.temperature;
        if (params.max_new_tokens !== undefined) baseParams.max_new_tokens = params.max_new_tokens;
        if (params.cfg_scale !== undefined) baseParams.cfg_scale = params.cfg_scale;
        if (params.cfg_filter_top_k !== undefined) baseParams.cfg_filter_top_k = params.cfg_filter_top_k;
        if (params.input_audio) baseParams.input_audio = params.input_audio;
        if (params.seed !== undefined) baseParams.seed = params.seed;
        break;
        
      case 'orpheus-tts':
        if (params.voice) baseParams.voice = params.voice;
        if (params.top_p !== undefined) baseParams.top_p = params.top_p;
        if (params.temperature !== undefined) baseParams.temperature = params.temperature;
        if (params.max_new_tokens !== undefined) baseParams.max_new_tokens = params.max_new_tokens;
        if (params.repetition_penalty !== undefined) baseParams.repetition_penalty = params.repetition_penalty;
        break;
    }
    
    // Set base64 to false for audio to get binary response
    // Only add if the model actually supports the base64 parameter
    if (model.parameters.shape.base64 !== undefined) {
      baseParams.base64 = false;
    }

    // Merge with model defaults
    return this.mergeWithDefaults(baseParams, model);
  }
}

export const generateAudioTool = new GenerateAudioTool();