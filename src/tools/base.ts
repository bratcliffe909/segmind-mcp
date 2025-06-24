import { CallToolResult, TextContent, ImageContent } from '@modelcontextprotocol/sdk/types.js';

import { apiClient } from '../api/client.js';
import { ModelConfig, ModelCategory } from '../models/registry.js';
import { 
  NetworkError, 
  TimeoutError, 
  InsufficientCreditsError,
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
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`Calling model ${model.id}`, {
        model: model.id,
        category: model.category,
        requestId: this.context?.requestId,
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
        content: this.processModelResponse(response, model),
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
  ): Array<TextContent | ImageContent> {
    const content: Array<TextContent | ImageContent> = [];

    // Handle different output types
    switch (model.outputType) {
      case 'image':
        if (response.data?.image) {
          content.push({
            type: 'image',
            data: response.data.image,
            mimeType: 'image/png',
          });
        } else if (response.data?.images) {
          // Handle multiple images
          response.data.images.forEach((img: string) => {
            content.push({
              type: 'image',
              data: img,
              mimeType: 'image/png',
            });
          });
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

    return content;
  }

  protected createErrorResponse(error: unknown): CallToolResult {
    mapToSafeError(error); // Ensure error is safe for logging
    
    let userMessage = 'An error occurred while processing your request.';
    
    if (error instanceof NetworkError) {
      userMessage = 'Unable to connect to Segmind API. Please check your internet connection.';
    } else if (error instanceof TimeoutError) {
      userMessage = 'The request took too long to process. Please try again.';
    } else if (error instanceof InsufficientCreditsError) {
      userMessage = 'Insufficient credits. Please add more credits to your Segmind account.';
    }

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