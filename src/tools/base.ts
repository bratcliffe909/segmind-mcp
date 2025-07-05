import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CallToolResult, TextContent, ImageContent } from '@modelcontextprotocol/sdk/types.js';

import { apiClient } from '../api/client.js';
import { ModelConfig, ModelCategory } from '../models/registry.js';
import { OutputType } from '../models/types.js';
import { config } from '../utils/config.js';
import { costTracker } from '../utils/cost-tracker.js';
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
    saveLocation?: string,
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`Calling model ${model.id}`, {
        model: model.id,
        category: model.category,
        requestId: this.context?.requestId,
        parameters: parameters,
      });

      // Make API request
      // Use generateImage for image models, request for others
      // Calculate timeout: use max of (3x estimated time, minimum based on output type)
      let timeout = model.estimatedTime * 1000 * 3; // 3x estimated time for safety
      
      if (model.outputType === OutputType.VIDEO) {
        // Video generation needs longer timeout - at least 5 minutes
        timeout = Math.max(timeout, 300000); // 5 minutes minimum for video
      } else if (model.outputType === OutputType.AUDIO) {
        // Audio generation (TTS/music) needs longer timeout - at least 5 minutes
        timeout = Math.max(timeout, 300000); // 5 minutes minimum for audio
      } else if (model.category === ModelCategory.IMAGE_ENHANCEMENT) {
        // Image enhancement might also need more time
        timeout = Math.max(timeout, 180000); // 3 minutes minimum
      }
      
      logger.info(`Model timeout configured`, {
        model: model.id,
        estimatedTime: model.estimatedTime,
        calculatedTimeout: model.estimatedTime * 1000 * 3,
        finalTimeout: timeout,
        timeoutMinutes: (timeout / 1000 / 60).toFixed(2),
      });
      
      const response = model.outputType === OutputType.IMAGE && model.category !== ModelCategory.IMAGE_ENHANCEMENT
        ? await apiClient.generateImage(model.id, parameters)
        : await apiClient.request(model.endpoint, {
            method: 'POST',
            body: parameters,
            timeout,
          });

      const processingTime = Date.now() - startTime;

      logger.info(`Model call successful`, {
        model: model.id,
        processingTime,
        creditsUsed: response.credits?.used,
      });

      // Track actual cost from API response
      if (response.credits?.used) {
        costTracker.recordCost(model.id, response.credits.used, {
          resolution: parameters.img_width && parameters.img_height 
            ? `${parameters.img_width}x${parameters.img_height}` 
            : undefined,
          quality: parameters.quality,
          samples: parameters.samples || parameters.num_images,
        });
      }

      return {
        content: await this.processModelResponse(response, model, parameters.prompt, saveLocation),
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

  protected async processModelResponse(
    response: any,
    model: ModelConfig,
    prompt?: string,
    saveLocation?: string,
  ): Promise<Array<TextContent | ImageContent>> {
    const content: Array<TextContent | ImageContent> = [];

    // Debug logging
    logger.debug('Processing model response', {
      modelId: model.id,
      outputType: model.outputType,
      responseKeys: Object.keys(response || {}),
      dataKeys: Object.keys(response.data || {}),
      hasImage: !!response.data?.image,
      hasImages: !!response.data?.images,
      creditsUsed: response.credits?.used
    });

    // Handle different output types
    switch (model.outputType) {
      case OutputType.IMAGE:
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
          
          // Save image to file
          const savedPath = await this.saveImageToFile(base64Data, mimeType, model, prompt, saveLocation);
          
          if (savedPath) {
            content.push({
              type: 'text',
              text: `Image saved to: ${savedPath}`,
            });
          }
        } else if (response.data?.images) {
          // Handle multiple images
          for (let index = 0; index < response.data.images.length; index++) {
            const img = response.data.images[index];
            const mimeType = response.data.mimeType || 'image/png';
            let base64Data = img;
            
            // If data URL format, extract pure base64
            if (base64Data.startsWith('data:')) {
              const match = base64Data.match(/^data:[^;]+;base64,(.+)$/);
              if (match && match[1]) {
                base64Data = match[1];
              }
            }
            
            // Save to file
            const savedPath = await this.saveImageToFile(base64Data, mimeType, model, prompt ? `${prompt}-${index + 1}` : undefined, saveLocation);
            
            if (savedPath) {
              content.push({
                type: 'text',
                text: `Image ${index + 1} saved to: ${savedPath}`,
              });
            }
          }
        } else if (response.data?.url) {
          // Return URL as text if base64 not available
          content.push({
            type: 'text',
            text: `Image generated successfully. View at: ${response.data.url}`,
          });
        } else {
          // Log unexpected response structure for debugging
          logger.warn('Unexpected image response structure', {
            modelId: model.id,
            dataKeys: Object.keys(response.data || {}),
            dataType: typeof response.data,
          });
          
          // Fallback: show error instead of raw data
          content.push({
            type: 'text',
            text: 'Image generated but response format was unexpected. Please check the logs.',
          });
        }
        break;

      case OutputType.VIDEO:
        if (response.data?.video_url) {
          content.push({
            type: 'text',
            text: `Video generated successfully. View at: ${response.data.video_url}`,
          });
        } else if (response.data?.video) {
          // If video is base64, save it
          const videoPath = await this.saveVideoToFile(response.data.video, response.data.mimeType || 'video/mp4', model, saveLocation);
          if (videoPath) {
            content.push({
              type: 'text',
              text: `Video saved to: ${videoPath}`,
            });
          }
        }
        break;

      case OutputType.TEXT:
        if (response.data?.text) {
          content.push({
            type: 'text',
            text: response.data.text,
          });
        }
        break;

      case OutputType.AUDIO:
        if (response.data?.audio_url) {
          content.push({
            type: 'text',
            text: `Audio generated successfully. Download: ${response.data.audio_url}`,
          });
        } else if (response.data?.audio) {
          // If audio is base64, save it
          const audioPath = await this.saveAudioToFile(response.data.audio, 'audio/mpeg', model, saveLocation);
          if (audioPath) {
            content.push({
              type: 'text',
              text: `Audio saved to: ${audioPath}`,
            });
          }
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
            content: await this.processModelResponse(statusResponse, model),
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

  protected async saveImageToFile(
    base64Data: string,
    mimeType: string,
    model: ModelConfig,
    _prompt?: string,
    saveLocationOverride?: string
  ): Promise<string | null> {
    try {
      // Determine file extension
      const extension = mimeType.split('/')[1] || 'jpg';
      
      let filePath: string;
      
      // Check if saveLocationOverride is a full file path or directory
      if (saveLocationOverride && path.extname(saveLocationOverride)) {
        // It's a full file path - use it directly (for overwriting original)
        filePath = saveLocationOverride;
        // Ensure parent directory exists
        const saveDir = path.dirname(filePath);
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.mkdirSync(saveDir, { recursive: true });
      } else {
        // It's a directory path - generate filename
        const timestamp = Date.now();
        const modelName = model.id;
        const filename = `${modelName}-${timestamp}.${extension}`;
        
        // Use override location if provided, otherwise use config, otherwise temp
        const saveDir = saveLocationOverride || config.fileOutput.saveLocation || os.tmpdir();
        
        // Ensure directory exists
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.mkdirSync(saveDir, { recursive: true });
        
        // Full file path
        filePath = path.join(saveDir, filename);
      }
      
      // Save the image
      const buffer = Buffer.from(base64Data, 'base64');
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.writeFileSync(filePath, buffer);
      
      logger.info('Image saved to file', {
        path: filePath,
        size: buffer.length,
        mimeType
      });
      
      return filePath;
    } catch (error) {
      logger.error('Failed to save image to file', { error });
      return null;
    }
  }

  protected async saveAudioToFile(
    base64Data: string,
    mimeType: string,
    model: ModelConfig,
    saveLocationOverride?: string
  ): Promise<string | null> {
    try {
      // Determine file extension
      const extension = mimeType.includes('mpeg') ? 'mp3' : 
                       mimeType.includes('wav') ? 'wav' : 
                       mimeType.includes('ogg') ? 'ogg' : 'mp3';
      
      // Generate simple filename
      const timestamp = Date.now();
      const modelName = model.id;
      const filename = `${modelName}-${timestamp}.${extension}`;
      
      // Use override location if provided, otherwise use config, otherwise temp
      const saveDir = saveLocationOverride || config.fileOutput.saveLocation || os.tmpdir();
      
      // Ensure directory exists
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.mkdirSync(saveDir, { recursive: true });
      
      // Full file path
      const filePath = path.join(saveDir, filename);
      
      // Save the audio
      const buffer = Buffer.from(base64Data, 'base64');
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.writeFileSync(filePath, buffer);
      
      logger.info('Audio saved to file', {
        path: filePath,
        size: buffer.length,
        mimeType
      });
      
      return filePath;
    } catch (error) {
      logger.error('Failed to save audio to file', { error });
      return null;
    }
  }

  protected async saveVideoToFile(
    base64Data: string,
    mimeType: string,
    model: ModelConfig,
    saveLocationOverride?: string
  ): Promise<string | null> {
    try {
      // Determine file extension
      const extension = mimeType.includes('mp4') ? 'mp4' : 
                       mimeType.includes('webm') ? 'webm' : 
                       mimeType.includes('avi') ? 'avi' : 
                       mimeType.includes('mov') ? 'mov' : 'mp4';
      
      // Generate simple filename
      const timestamp = Date.now();
      const modelName = model.id;
      const filename = `${modelName}-${timestamp}.${extension}`;
      
      // Use override location if provided, otherwise use config, otherwise temp
      const saveDir = saveLocationOverride || config.fileOutput.saveLocation || os.tmpdir();
      
      // Ensure directory exists
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.mkdirSync(saveDir, { recursive: true });
      
      // Full file path
      const filePath = path.join(saveDir, filename);
      
      // Save the video
      const buffer = Buffer.from(base64Data, 'base64');
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.writeFileSync(filePath, buffer);
      
      logger.info('Video saved to file', {
        path: filePath,
        size: buffer.length,
        mimeType
      });
      
      return filePath;
    } catch (error) {
      logger.error('Failed to save video to file', { error });
      return null;
    }
  }
}