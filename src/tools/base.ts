import { CallToolResult, TextContent, ImageContent } from '@modelcontextprotocol/sdk/types.js';

import { apiClient } from '../api/client.js';
import { ModelConfig, ModelCategory } from '../models/registry.js';
import { 
  NetworkError, 
  TimeoutError, 
  InsufficientCreditsError,
  AuthenticationError,
  mapToSafeError 
} from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface ToolContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
}

export interface GenerationResult {
  content: Array<TextContent | ImageContent>;
  model: string;
  creditsUsed: number;
  processingTime: number;
  metadata?: Record<string, any>;
}

export abstract class BaseTool {
  protected abstract readonly name: string;
  protected abstract readonly description: string;
  
  constructor(protected context?: ToolContext) {}

  abstract execute(params: any): Promise<CallToolResult>;
  
  protected async callModel(
    model: ModelConfig,
    parameters: any,
    displayMode: 'display' | 'save' | 'both' = 'display',
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`Calling model ${model.id}`, {
        model: model.id,
        category: model.category,
        requestId: this.context?.requestId,
        displayMode,
      });

      // Make API request
      // Use generateImage for image models, request for others
      const response = model.outputType === 'image' && model.category !== ModelCategory.IMAGE_ENHANCEMENT
        ? await apiClient.generateImage(model.id, parameters)
        : await apiClient.request(model.endpoint, {
            method: 'POST',
            body: parameters,
            timeout: model.estimatedTime * 1000 * 2, // 2x estimated time
          });

      const processingTime = Date.now() - startTime;

      logger.info(`Model call successful`, {
        model: model.id,
        processingTime,
        creditsUsed: response.credits?.used,
      });

      return {
        content: this.processModelResponse(response, model, displayMode),
        model: model.id,
        creditsUsed: response.credits?.used || model.creditsPerUse,
        processingTime,
        metadata: response.metadata,
      };
    } catch (error) {
      logger.error(`Model call failed`, {
        model: model.id,
        error: mapToSafeError(error),
        processingTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  protected processModelResponse(
    response: any,
    model: ModelConfig,
    displayMode: 'display' | 'save' | 'both' = 'display',
  ): Array<TextContent | ImageContent> {
    const content: Array<TextContent | ImageContent> = [];

    // Handle different output types
    switch (model.outputType) {
      case 'image':
        if (response.data?.image) {
          // Get mime type from response or default to image/png
          const mimeType = response.data.mimeType || 'image/png';
          let base64Data = response.data.image;
          
          // If data URL format, extract pure base64
          if (base64Data.startsWith('data:')) {
            const match = base64Data.match(/^data:[^;]+;base64,(.+)$/);
            if (match) {
              base64Data = match[1];
            }
          }
          
          if (displayMode === 'save') {
            // Return only base64 string for saving
            content.push({
              type: 'text',
              text: `BASE64_IMAGE_START\n${base64Data}\nBASE64_IMAGE_END`,
            });
            content.push({
              type: 'text',
              text: `\nImage data ready for saving. MIME type: ${mimeType}, Extension: .${mimeType.split('/')[1] || 'jpg'}`,
            });
          } else {
            // Return as image for display (display or both mode)
            content.push({
              type: 'image',
              data: base64Data,  // Pure base64 without data URL prefix
              mimeType: mimeType,
            });
          }
        } else if (response.data?.images) {
          // Handle multiple images
          response.data.images.forEach((img: string, index: number) => {
            const mimeType = response.data.mimeType || 'image/png';
            let base64Data = img;
            
            // If data URL format, extract pure base64
            if (base64Data.startsWith('data:')) {
              const match = base64Data.match(/^data:[^;]+;base64,(.+)$/);
              if (match && match[1]) {
                base64Data = match[1];
              }
            }
            
            if (displayMode === 'save') {
              content.push({
                type: 'text',
                text: `BASE64_IMAGE_${index + 1}_START\n${base64Data}\nBASE64_IMAGE_${index + 1}_END`,
              });
            } else {
              content.push({
                type: 'image',
                data: base64Data,  // Pure base64 without data URL prefix
                mimeType: mimeType,
              });
            }
          });
          
          if (displayMode === 'save' && response.data?.images?.length > 0) {
            content.push({
              type: 'text',
              text: `\n${response.data.images.length} image(s) ready for saving. MIME type: ${response.data.mimeType || 'image/png'}`,
            });
          }
        } else if (response.data?.url) {
          // Return URL as text if base64 not available
          content.push({
            type: 'text',
            text: `Image generated successfully. View at: ${response.data.url}`,
          });
        }
        break;

      case 'video':
        if (response.data?.video_url) {
          content.push({
            type: 'text',
            text: `Video generated successfully. View at: ${response.data.video_url}`,
          });
        }
        break;

      case 'text':
        if (response.data?.text) {
          content.push({
            type: 'text',
            text: response.data.text,
          });
        }
        break;

      default:
        content.push({
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        });
    }

    // Add generation info
    if (response.credits) {
      content.push({
        type: 'text',
        text: `\n\nCredits used: ${response.credits.used} | Remaining: ${response.credits.remaining}`,
      });
    }
    
    // Add helpful instructions based on display mode
    if (model.outputType === 'image') {
      if (displayMode === 'save' && content.some(c => c.type === 'text' && c.text.includes('BASE64_IMAGE'))) {
        content.push({
          type: 'text',
          text: `\n📝 Save Instructions:
The base64 data above (between BASE64_IMAGE_START and BASE64_IMAGE_END markers) can be:
1. Decoded from base64
2. Written to a file with the appropriate extension
3. The data is ready for direct file operations`,
        });
      } else if (displayMode === 'display' && content.some(c => c.type === 'image')) {
        const imageContent = content.find(c => c.type === 'image') as any;
        const mimeType = imageContent?.mimeType || 'image/jpeg';
        const extension = mimeType.split('/')[1] || 'jpg';
        
        // Calculate approximate size
        const imageSizeBytes = imageContent?.data ? Buffer.from(imageContent.data, 'base64').length : 0;
        const imageSizeKB = Math.round(imageSizeBytes / 1024);
        const sizeWarning = imageSizeKB > 900 ? ' ⚠️ Large image (may exceed MCP limit)' : '';
        
        content.push({
          type: 'text',
          text: `\n🖼️ Image generated successfully! (${imageSizeKB}KB${sizeWarning})
          
**Claude Desktop Users**: If the image doesn't appear above:
• Try: "Generate again with display_mode='save'" to get base64 data
• Or: "Generate again with display_mode='both'" for both views
• Alternative: Save the image locally and attach via 📎 paperclip

**Format**: ${mimeType} (save as .${extension})`,
        });
      } else if (displayMode === 'both' && content.some(c => c.type === 'image')) {
        // For 'both' mode, we need to add the base64 data after the image
        const imageContents = content.filter(c => c.type === 'image');
        imageContents.forEach((img: any, index: number) => {
          content.push({
            type: 'text',
            text: `\nBASE64_IMAGE_${index + 1}_START\n${img.data}\nBASE64_IMAGE_${index + 1}_END`,
          });
        });
        
        content.push({
          type: 'text',
          text: `\n📝 Display + Save Mode:
✅ Images displayed above (if supported by your client)
✅ Base64 data provided below for saving

To save: Copy the text between BASE64_IMAGE_START and BASE64_IMAGE_END markers, 
decode from base64, and save with the appropriate extension.`,
        });
      }
    }

    return content;
  }

  protected createErrorResponse(error: unknown): CallToolResult {
    const safeError = mapToSafeError(error);
    
    let userMessage = 'An error occurred while processing your request.';
    
    if (error instanceof NetworkError) {
      userMessage = 'Unable to connect to Segmind API. Please check your internet connection.';
    } else if (error instanceof TimeoutError) {
      userMessage = 'The request took too long to process. Please try again.';
    } else if (error instanceof InsufficientCreditsError) {
      userMessage = 'Insufficient credits. Please add more credits to your Segmind account.';
    } else if (error instanceof AuthenticationError) {
      userMessage = 'Authentication failed. Please check that your SEGMIND_API_KEY is valid and properly configured.';
    } else if (error instanceof Error) {
      // Include actual error message for other errors to help debugging
      userMessage = `Error: ${error.message || 'Unknown error occurred'}`;
    }

    // Log the full error for debugging
    logger.error('Tool execution error', {
      error: safeError,
      userMessage,
    });

    return {
      content: [
        {
          type: 'text',
          text: userMessage,
        },
      ],
      isError: true,
    };
  }

  protected async handleLongRunningOperation(
    model: ModelConfig,
    parameters: any,
  ): Promise<GenerationResult> {
    if (model.apiVersion === 'v2') {
      // For v2 endpoints, we need to handle async operations
      logger.info(`Starting long-running operation for ${model.id}`);
      
      // Initial request to start the job
      const startResponse = await apiClient.request(model.endpoint, {
        method: 'POST',
        body: parameters,
      });

      const jobData = startResponse.data as any;
      if (!jobData?.job_id) {
        throw new Error('No job ID returned from API');
      }

      const jobId = jobData.job_id;
      
      // Poll for completion
      return this.pollForCompletion(jobId, model);
    } else {
      // Regular synchronous call
      return this.callModel(model, parameters);
    }
  }

  private async pollForCompletion(
    jobId: string,
    model: ModelConfig,
  ): Promise<GenerationResult> {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    const pollInterval = 5000; // 5 seconds
    let attempts = 0;
    const startTime = Date.now();

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        const statusResponse = await apiClient.request(`/jobs/${jobId}`, {
          method: 'GET',
        });

        const statusData = statusResponse.data as any;
        logger.debug(`Job ${jobId} status: ${statusData?.status}`);

        if (statusData?.status === 'completed') {
          const processingTime = Date.now() - startTime;
          
          return {
            content: this.processModelResponse(statusResponse, model),
            model: model.id,
            creditsUsed: statusResponse.credits?.used || model.creditsPerUse,
            processingTime,
            metadata: statusResponse.metadata,
          };
        } else if (statusData?.status === 'failed') {
          throw new Error(statusData?.error || 'Job failed');
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        if (attempts === maxAttempts) {
          throw new TimeoutError('Job polling timeout');
        }
        // Continue polling on transient errors
        logger.warn(`Error polling job ${jobId}, attempt ${attempts}`, { error });
      }
    }

    throw new TimeoutError('Job did not complete within timeout period');
  }

  protected mergeWithDefaults(
    params: any,
    model: ModelConfig,
  ): any {
    return {
      ...model.defaultParams,
      ...params,
    };
  }
}