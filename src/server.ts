import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { apiClient } from './api/client.js';
import { modelRegistry, ModelCategory } from './models/registry.js';
import { 
  generateImageTool,
  transformImageTool,
  generateVideoTool,
  enhanceImageTool,
  specializedGenerationTool
} from './tools/index.js';
import type { ServerState } from './types/index.js';
import { config, getMaskedApiKey } from './utils/config.js';
import { mapToSafeError, formatErrorResponse } from './utils/errors.js';
import { logger } from './utils/logger.js';

export class SegmindMCPServer {
  private server: Server;
  private state: ServerState;
  
  constructor() {
    this.state = {
      isInitialized: false,
      modelsLoaded: false,
      activeRequests: 0,
      rateLimits: new Map(),
    };
    
    // Initialize MCP server
    this.server = new Server(
      {
        name: '@segmind/mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      },
    );
    
    this.setupHandlers();
  }
  
  /**
   * Set up request handlers
   */
  private setupHandlers(): void {
    // Tool handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.info('Listing available tools');
      
      // Get available text-to-image models for enum
      const t2iModels = modelRegistry.getModelsByCategory(ModelCategory.TEXT_TO_IMAGE);
      const modelIds = t2iModels.map(m => m.id);
      
      return {
        tools: [
          {
            name: 'generate_image',
            description: 'Generate images from text prompts using various AI models',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Text prompt describing the image to generate',
                  minLength: 1,
                  maxLength: 4000,
                },
                model: {
                  type: 'string',
                  description: `Model to use (default: auto-select based on prompt)`,
                  enum: modelIds,
                },
                negative_prompt: {
                  type: 'string',
                  description: 'What to avoid in the generation',
                },
                width: {
                  type: 'number',
                  description: 'Image width (must be multiple of 8)',
                  minimum: 256,
                  maximum: 2048,
                  multipleOf: 8,
                },
                height: {
                  type: 'number',
                  description: 'Image height (must be multiple of 8)',
                  minimum: 256,
                  maximum: 2048,
                  multipleOf: 8,
                },
                num_images: {
                  type: 'number',
                  description: 'Number of images to generate',
                  minimum: 1,
                  maximum: 4,
                  default: 1,
                },
                seed: {
                  type: 'number',
                  description: 'Seed for reproducible generation',
                },
                quality: {
                  type: 'string',
                  description: 'Quality preset',
                  enum: ['draft', 'standard', 'high'],
                  default: 'standard',
                },
                style: {
                  type: 'string',
                  description: 'Style modifier (e.g., "photorealistic", "anime", "oil painting")',
                },
              },
              required: ['prompt'],
            },
          },
          {
            name: 'list_models',
            description: 'List available AI models by category',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Filter by category',
                  enum: Object.values(ModelCategory),
                },
              },
            },
          },
          {
            name: 'get_model_info',
            description: 'Get detailed information about a specific model',
            inputSchema: {
              type: 'object',
              properties: {
                model_id: {
                  type: 'string',
                  description: 'Model ID',
                },
              },
              required: ['model_id'],
            },
          },
          {
            name: 'transform_image',
            description: 'Transform existing images using AI with various control methods',
            inputSchema: {
              type: 'object',
              properties: {
                image: {
                  type: 'string',
                  description: 'Input image as base64 string or URL',
                },
                prompt: {
                  type: 'string',
                  description: 'Transformation prompt describing desired changes',
                  minLength: 1,
                  maxLength: 2000,
                },
                model: {
                  type: 'string',
                  description: 'Model ID to use for transformation',
                  enum: modelRegistry.getModelsByCategory(ModelCategory.IMAGE_TO_IMAGE).map(m => m.id),
                },
                negative_prompt: {
                  type: 'string',
                  description: 'What to avoid in the transformation',
                },
                strength: {
                  type: 'number',
                  description: 'Transformation strength (0=no change, 1=complete change)',
                  minimum: 0,
                  maximum: 1,
                  default: 0.75,
                },
                mask: {
                  type: 'string',
                  description: 'Mask image for inpainting (base64 or URL)',
                },
                control_type: {
                  type: 'string',
                  description: 'ControlNet type',
                  enum: ['canny', 'depth', 'pose', 'scribble', 'segmentation'],
                },
                seed: {
                  type: 'number',
                  description: 'Seed for reproducible generation',
                },
              },
              required: ['image', 'prompt'],
            },
          },
          {
            name: 'generate_video',
            description: 'Generate videos from text prompts or animate static images',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Text prompt or motion description for video generation',
                  minLength: 1,
                  maxLength: 2000,
                },
                model: {
                  type: 'string',
                  description: 'Model ID to use for video generation',
                  enum: modelRegistry.getModelsByCategory(ModelCategory.VIDEO_GENERATION).map(m => m.id),
                },
                image: {
                  type: 'string',
                  description: 'Input image for image-to-video generation (base64 or URL)',
                },
                duration: {
                  type: 'number',
                  description: 'Video duration in seconds',
                  minimum: 1,
                  maximum: 30,
                  default: 5,
                },
                fps: {
                  type: 'number',
                  description: 'Frames per second',
                  minimum: 12,
                  maximum: 60,
                  default: 24,
                },
                aspect_ratio: {
                  type: 'string',
                  description: 'Video aspect ratio',
                  enum: ['16:9', '9:16', '1:1', '4:3'],
                  default: '16:9',
                },
                quality: {
                  type: 'string',
                  description: 'Video quality preset',
                  enum: ['standard', 'high', 'ultra'],
                  default: 'high',
                },
                seed: {
                  type: 'number',
                  description: 'Seed for reproducible generation',
                },
              },
              required: ['prompt'],
            },
          },
          {
            name: 'enhance_image',
            description: 'Enhance images with upscaling, restoration, background removal, and more',
            inputSchema: {
              type: 'object',
              properties: {
                image: {
                  type: 'string',
                  description: 'Input image as base64 string or URL',
                },
                operation: {
                  type: 'string',
                  description: 'Enhancement operation to perform',
                  enum: ['upscale', 'restore', 'remove_background', 'colorize', 'denoise'],
                },
                model: {
                  type: 'string',
                  description: 'Specific model to use for enhancement',
                  enum: modelRegistry.getModelsByCategory(ModelCategory.IMAGE_ENHANCEMENT).map(m => m.id),
                },
                scale: {
                  type: 'string',
                  description: 'Upscaling factor (for upscale operation)',
                  enum: ['2', '4', '8'],
                  default: '4',
                },
                face_enhance: {
                  type: 'boolean',
                  description: 'Enhance faces during upscaling',
                  default: false,
                },
                return_mask: {
                  type: 'boolean',
                  description: 'Return mask for background removal',
                  default: false,
                },
                batch_size: {
                  type: 'number',
                  description: 'Number of images to process',
                  minimum: 1,
                  maximum: 10,
                  default: 1,
                },
              },
              required: ['image', 'operation'],
            },
          },
          {
            name: 'specialized_generation',
            description: 'Generate specialized content like QR codes, stickers, avatars, outfits, and logos',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'Type of specialized content to generate',
                  enum: ['qr_code', 'sticker', 'avatar', 'outfit', 'logo'],
                },
                model: {
                  type: 'string',
                  description: 'Specific model to use',
                  enum: modelRegistry.getModelsByCategory(ModelCategory.SPECIALIZED_GENERATION).map(m => m.id),
                },
                qr_text: {
                  type: 'string',
                  description: 'Text/URL to encode in QR code (for qr_code type)',
                },
                qr_prompt: {
                  type: 'string',
                  description: 'Artistic style prompt for QR code',
                },
                sticker_image: {
                  type: 'string',
                  description: 'Input image for sticker generation (base64 or URL)',
                },
                sticker_style: {
                  type: 'string',
                  description: 'Sticker art style',
                  enum: ['cartoon', 'anime', 'pixel', 'sketch'],
                  default: 'cartoon',
                },
                logo_text: {
                  type: 'string',
                  description: 'Company/brand name for logo',
                },
                logo_style: {
                  type: 'string',
                  description: 'Logo design style',
                  enum: ['modern', 'vintage', 'minimalist', 'abstract'],
                  default: 'modern',
                },
                prompt: {
                  type: 'string',
                  description: 'General description or style instructions',
                },
                num_outputs: {
                  type: 'number',
                  description: 'Number of variations to generate',
                  minimum: 1,
                  maximum: 4,
                  default: 1,
                },
                seed: {
                  type: 'number',
                  description: 'Seed for reproducible generation',
                },
              },
              required: ['type'],
            },
          },
          {
            name: 'check_credits',
            description: 'Check remaining API credits',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });
    
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.info('Tool called', { tool: name });
      this.state.activeRequests++;
      
      try {
        // Generate request ID for tracking (for future use)
        // const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        switch (name) {
          case 'generate_image':
            return await generateImageTool.execute(args);
          
          case 'transform_image':
            return await transformImageTool.execute(args);
          
          case 'generate_video':
            return await generateVideoTool.execute(args);
          
          case 'enhance_image':
            return await enhanceImageTool.execute(args);
          
          case 'specialized_generation':
            return await specializedGenerationTool.execute(args);
            
          case 'list_models': {
            const category = args?.category;
            const models = category 
              ? modelRegistry.getModelsByCategory(category as ModelCategory)
              : modelRegistry.getAllModels();
            
            const modelList = models.map(m => ({
              id: m.id,
              name: m.name,
              description: m.description,
              category: m.category,
              creditsPerUse: m.creditsPerUse,
              estimatedTime: m.estimatedTime,
            }));
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(modelList, null, 2),
                },
              ],
            };
          }
          
          case 'get_model_info': {
            const modelId = args?.model_id;
            if (!modelId) {
              throw new Error('model_id is required');
            }
            
            const model = modelRegistry.getModel(modelId as string);
            if (!model) {
              throw new Error(`Model ${modelId} not found`);
            }
            
            const info = {
              id: model.id,
              name: model.name,
              description: model.description,
              category: model.category,
              endpoint: model.endpoint,
              apiVersion: model.apiVersion,
              outputType: model.outputType,
              estimatedTime: model.estimatedTime,
              creditsPerUse: model.creditsPerUse,
              supportedFormats: model.supportedFormats,
              maxDimensions: model.maxDimensions,
              defaultParams: model.defaultParams,
              parameters: Object.keys(model.parameters.shape),
            };
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(info, null, 2),
                },
              ],
            };
          }
          
          case 'check_credits': {
            try {
              const credits = await apiClient.getCredits();
              return {
                content: [
                  {
                    type: 'text',
                    text: `API Credits:\nRemaining: ${credits.remaining}\nUsed: ${credits.used}`,
                  },
                ],
              };
            } catch (error) {
              logger.warn('Failed to fetch credits, using mock data');
              return {
                content: [
                  {
                    type: 'text',
                    text: 'API Credits:\nRemaining: 1000\nUsed: 0\n\n(Note: Using mock data - API connection pending)',
                  },
                ],
              };
            }
          }
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const safeError = mapToSafeError(error);
        logger.error('Tool execution failed', formatErrorResponse(safeError));
        throw safeError;
      } finally {
        this.state.activeRequests--;
      }
    });
    
    // Resource handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      logger.info('Listing available resources');
      
      // Add resources for each model category
      const categoryResources = Object.values(ModelCategory).map(category => ({
        uri: `segmind://models/${category}`,
        name: `${category.replace('_', ' ').toUpperCase()} Models`,
        description: `List models in the ${category} category`,
        mimeType: 'application/json',
      }));
      
      return {
        resources: [
          {
            uri: 'segmind://models',
            name: 'All Available Models',
            description: 'List all available Segmind models',
            mimeType: 'application/json',
          },
          ...categoryResources,
          {
            uri: 'segmind://credits',
            name: 'API Credits',
            description: 'Check remaining API credits',
            mimeType: 'application/json',
          },
        ],
      };
    });
    
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      logger.info('Reading resource', { uri });
      
      try {
        if (uri === 'segmind://models') {
          // Return all models
          const models = modelRegistry.getAllModels();
          const modelData = models.map(m => ({
            id: m.id,
            name: m.name,
            description: m.description,
            category: m.category,
            creditsPerUse: m.creditsPerUse,
            estimatedTime: m.estimatedTime,
            outputType: m.outputType,
            supportedFormats: m.supportedFormats,
          }));
          
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  totalModels: models.length,
                  models: modelData,
                }, null, 2),
              },
            ],
          };
        }
        
        // Check if it's a category-specific resource
        const categoryMatch = uri.match(/^segmind:\/\/models\/(.+)$/);
        if (categoryMatch) {
          const category = categoryMatch[1] as ModelCategory;
          const models = modelRegistry.getModelsByCategory(category);
          
          if (models.length === 0) {
            throw new Error(`Invalid category: ${category}`);
          }
          
          const modelData = models.map(m => ({
            id: m.id,
            name: m.name,
            description: m.description,
            creditsPerUse: m.creditsPerUse,
            estimatedTime: m.estimatedTime,
            outputType: m.outputType,
            supportedFormats: m.supportedFormats,
            defaultParams: m.defaultParams,
          }));
          
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  category,
                  totalModels: models.length,
                  models: modelData,
                }, null, 2),
              },
            ],
          };
        }
        
        if (uri === 'segmind://credits') {
          try {
            const credits = await apiClient.getCredits();
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify({
                    credits: {
                      remaining: credits.remaining,
                      used: credits.used,
                    },
                    lastUpdated: new Date().toISOString(),
                  }, null, 2),
                },
              ],
            };
          } catch (error) {
            logger.warn('Failed to fetch credits, using mock data');
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify({
                    credits: {
                      remaining: 1000,
                      used: 0,
                    },
                    lastUpdated: new Date().toISOString(),
                    note: 'Using mock data - API connection pending',
                  }, null, 2),
                },
              ],
            };
          }
        }
        
        throw new Error(`Unknown resource: ${uri}`);
      } catch (error) {
        const safeError = mapToSafeError(error);
        logger.error('Resource read failed', formatErrorResponse(safeError));
        throw safeError;
      }
    });
    
    // Prompt handlers
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      logger.info('Listing available prompts');
      
      return {
        prompts: [
          {
            name: 'art_styles',
            description: 'Generate images in specific art styles',
            arguments: [
              {
                name: 'style',
                description: 'Art style (e.g., impressionist, anime, photorealistic)',
                required: true,
              },
              {
                name: 'subject',
                description: 'What to depict',
                required: true,
              },
            ],
          },
        ],
      };
    });
    
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.info('Getting prompt', { name });
      
      try {
        switch (name) {
          case 'art_styles':
            const style = args?.['style'] || 'photorealistic';
            const subject = args?.['subject'] || 'landscape';
            
            return {
              description: `Generate ${subject} in ${style} style`,
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `Create a ${style} artwork depicting: ${subject}. Include rich details and appropriate artistic techniques for the ${style} style.`,
                  },
                },
              ],
            };
            
          default:
            throw new Error(`Unknown prompt: ${name}`);
        }
      } catch (error) {
        const safeError = mapToSafeError(error);
        logger.error('Prompt generation failed', formatErrorResponse(safeError));
        throw safeError;
      }
    });
  }
  
  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting Segmind MCP Server', {
        version: '0.1.0',
        nodeVersion: process.version,
        apiKey: getMaskedApiKey(config.apiKey),
      });
      
      // Create stdio transport
      const transport = new StdioServerTransport();
      
      // Connect server to transport
      await this.server.connect(transport);
      
      this.state.isInitialized = true;
      logger.info('Segmind MCP Server started successfully');
      
    } catch (error) {
      logger.error('Failed to start server', { error });
      throw mapToSafeError(error);
    }
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Segmind MCP Server');
    
    // Wait for active requests to complete
    const timeout = 30000; // 30 seconds
    const start = Date.now();
    
    while (this.state.activeRequests > 0 && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (this.state.activeRequests > 0) {
      logger.warn('Forcing shutdown with active requests', {
        activeRequests: this.state.activeRequests,
      });
    }
    
    await this.server.close();
    logger.info('Server shutdown complete');
  }
}

// Export singleton instance
export const server = new SegmindMCPServer();