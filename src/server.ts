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
  specializedGenerationTool,
  estimateCostTool
} from './tools/index.js';
import type { ServerState } from './types/index.js';
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
          logging: {}, // Enable logging capability
        },
      },
    );
    
    // Set up initialization callback
    this.server.oninitialized = () => {
      // Now it's safe to send notifications after MCP handshake is complete
      void this.handlePostInitialization();
    };
    
    this.setupHandlers();
  }
  
  /**
   * Handle post-initialization tasks
   */
  private async handlePostInitialization(): Promise<void> {
    try {
      // Now we can safely send notifications
      await this.sendMCPLog('info', 'Segmind MCP Server initialized');
      
      // Check API key and notify via MCP
      const hasApiKey = !!process.env.SEGMIND_API_KEY;
      if (!hasApiKey) {
        await this.sendMCPLog('warning', 'SEGMIND_API_KEY not found', {
          help: 'Please set SEGMIND_API_KEY in your environment or MCP configuration',
          impact: 'API calls will fail without a valid API key',
        });
      }
    } catch (err) {
      // Silently fail if we can't send notifications
      logger.error('Failed to send post-initialization notifications', { error: err });
    }
  }

  /**
   * Send log message through MCP protocol
   */
  async sendMCPLog(
    level: 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency',
    message: string,
    data?: unknown
  ): Promise<void> {
    try {
      await this.server.sendLoggingMessage({
        level,
        logger: 'segmind-mcp',
        data: data ? { message, ...data } : message,
      });
    } catch (err) {
      // If we can't send logs via MCP, fall back to internal logger
      logger.error('Failed to send MCP log', { level, message, error: err });
    }
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
            description: 'Generate images from text prompts using various AI models. Returns base64-encoded image data with MIME type information.',
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
                display_mode: {
                  type: 'string',
                  description: 'How to return the image: display (show image), save (return base64 for saving), both (show image and provide base64)',
                  enum: ['display', 'save', 'both'],
                  default: 'display',
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
                display_mode: {
                  type: 'string',
                  description: 'How to return the image: display (show image), save (return base64 for saving), both (show image and provide base64)',
                  enum: ['display', 'save', 'both'],
                  default: 'display',
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
                display_mode: {
                  type: 'string',
                  description: 'How to return the image: display (show image), save (return base64 for saving), both (show image and provide base64)',
                  enum: ['display', 'save', 'both'],
                  default: 'display',
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
                display_mode: {
                  type: 'string',
                  description: 'How to return the image: display (show image), save (return base64 for saving), both (show image and provide base64)',
                  enum: ['display', 'save', 'both'],
                  default: 'display',
                },
              },
              required: ['type'],
            },
          },
          {
            name: 'estimate_cost',
            description: 'Estimate the credit cost and time for image/video generation operations',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  description: 'Type of operation (generate, transform, enhance, etc.)',
                },
                model: {
                  type: 'string',
                  description: 'Model ID to estimate cost for',
                },
                category: {
                  type: 'string',
                  description: 'Model category to list costs for',
                },
                num_images: {
                  type: 'number',
                  description: 'Number of images to generate',
                  minimum: 1,
                  maximum: 10,
                },
                num_outputs: {
                  type: 'number',
                  description: 'Number of outputs to generate',
                  minimum: 1,
                  maximum: 10,
                },
                list_all: {
                  type: 'boolean',
                  description: 'List costs for all available models',
                },
              },
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
          
          case 'estimate_cost':
            return await estimateCostTool.execute(args);
          
          case 'check_credits': {
            const credits = await apiClient.getCredits();
            return {
              content: [
                {
                  type: 'text',
                  text: `API Credits:\nRemaining: ${credits.remaining}\nUsed: ${credits.used}`,
                },
              ],
            };
          }
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const safeError = mapToSafeError(error);
        logger.error('Tool execution failed', formatErrorResponse(safeError));
        
        // Send error via MCP for client visibility
        await this.sendMCPLog('error', `Tool execution failed: ${name}`, {
          tool: name,
          error: safeError.userMessage,
          code: safeError.code,
        });
        
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
      // Create stdio transport
      const transport = new StdioServerTransport();
      
      // Set up transport event handlers
      transport.onclose = () => {
        logger.info('Transport closed, shutting down server');
        // Exit cleanly when stdio transport closes
        process.exit(0);
      };
      
      transport.onerror = (error) => {
        logger.error('Transport error', { error });
        // Exit with error code when transport has an error
        process.exit(1);
      };
      
      // Set error handler on the server
      this.server.onerror = (error) => {
        // Don't log to console in MCP mode to avoid stdio interference
        logger.error('MCP Server Error', { error });
        // Also send via MCP protocol for client visibility
        void this.sendMCPLog('error', 'MCP Server Error', { error: error.message || error });
      };
      
      // Connect server to transport
      await this.server.connect(transport);
      
      this.state.isInitialized = true;
      
      // Don't log to console in MCP mode to avoid interfering with stdio transport
      logger.info('Segmind MCP Server started successfully');
      
      // Don't send MCP notifications during startup as it interferes with protocol initialization
      // The client will discover API key status when it tries to use the tools
      
    } catch (error) {
      // Don't log to console in MCP mode
      logger.error('Failed to start server', { error });
      throw error;
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