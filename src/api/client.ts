import type { SegmindApiResponse } from '../types/index.js';
import { config } from '../utils/config.js';
import {
  NetworkError,
  TimeoutError,
  AuthenticationError,
  RateLimitError,
  InsufficientCreditsError,
  mapToSafeError,
} from '../utils/errors.js';
import { logger } from '../utils/logger.js';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  responseType?: 'json' | 'buffer' | 'auto';
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatuses: number[];
}

export class SegmindApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly defaultTimeout: number;
  private readonly retryConfig: RetryConfig;
  
  constructor() {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey || '';
    this.defaultTimeout = config.limits.requestTimeout;
    
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      retryableStatuses: [408, 429, 500, 502, 503, 504],
    };
  }
  
  /**
   * Make an authenticated request to the Segmind API
   */
  async request<T = unknown>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<SegmindApiResponse<T>> {
    // Check for API key early
    if (!this.apiKey || this.apiKey.length === 0) {
      throw new AuthenticationError('SEGMIND_API_KEY is not configured. Please set it in your environment or MCP configuration.');
    }
    
    const {
      method = 'GET',
      body,
      headers = {},
      timeout = this.defaultTimeout,
      retries = this.retryConfig.maxRetries,
      responseType = 'auto',
    } = options;
    
    const url = `${this.baseUrl}${endpoint}`;
    
    // Prepare headers
    const requestHeaders: Record<string, string> = {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
      'User-Agent': '@segmind/mcp-server/0.1.0',
      ...headers,
    };
    
    // Prepare request options
    const fetchOptions: RequestInit = {
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(timeout),
    };
    
    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }
    
    // Log request (without sensitive data)
    logger.debug('API request', {
      endpoint,
      method,
      timeout,
    });
    
    // Execute request with retries
    return this.executeWithRetry<T>(url, fetchOptions, retries, responseType);
  }
  
  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    url: string,
    options: RequestInit,
    retriesLeft: number,
    responseType: 'json' | 'buffer' | 'auto' = 'auto',
  ): Promise<SegmindApiResponse<T>> {
    try {
      const response = await fetch(url, options);
      
      // Check for rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : this.retryConfig.baseDelay;
        
        if (retriesLeft > 0) {
          logger.warn('Rate limited, retrying', { delay, retriesLeft });
          await this.delay(delay);
          return this.executeWithRetry<T>(url, options, retriesLeft - 1, responseType);
        }
        
        throw new RateLimitError();
      }
      
      // Check for authentication errors
      if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError();
      }
      
      // Check for insufficient credits
      if (response.status === 402) {
        throw new InsufficientCreditsError();
      }
      
      // Check for 406 which might be insufficient credits
      if (response.status === 406) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          try {
            const errorData = await response.json() as any;
            if (errorData?.error && typeof errorData.error === 'string' && errorData.error.toLowerCase().includes('credits')) {
              throw new InsufficientCreditsError(errorData.error);
            }
            throw new Error(errorData?.error || `API request failed with status ${response.status}`);
          } catch (e) {
            if (e instanceof InsufficientCreditsError) throw e;
            throw new Error(`API request failed with status ${response.status}`);
          }
        }
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      // Check if retry is needed
      if (
        this.retryConfig.retryableStatuses.includes(response.status) &&
        retriesLeft > 0
      ) {
        const delay = this.calculateRetryDelay(
          this.retryConfig.maxRetries - retriesLeft,
        );
        
        logger.warn('Request failed, retrying', {
          status: response.status,
          delay,
          retriesLeft,
        });
        
        await this.delay(delay);
        return this.executeWithRetry<T>(url, options, retriesLeft - 1, responseType);
      }
      
      // Determine response type
      const contentType = response.headers.get('content-type') || '';
      const isImage = contentType.includes('image/');
      const isVideo = contentType.includes('video/');
      const isAudio = contentType.includes('audio/');
      const isBinary = isImage || isVideo || isAudio;
      const isJson = contentType.includes('application/json');
      
      let responseData: SegmindApiResponse<T>;
      
      // Handle different response types
      if (responseType === 'buffer' || (responseType === 'auto' && isBinary)) {
        // Handle raw binary response (image, video, audio)
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API request failed with status ${response.status}: ${errorText}`);
        }
        
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = contentType.split(';')[0];
        
        // Determine the data key based on content type
        let dataKey: string;
        if (isImage) {
          dataKey = 'image';
        } else if (isVideo) {
          dataKey = 'video';
        } else if (isAudio) {
          dataKey = 'audio';
        } else {
          dataKey = 'data';
        }
        
        responseData = {
          data: {
            [dataKey]: base64,  // Return pure base64 without data URL prefix
            format: mimeType ? mimeType.split('/')[1] : 'unknown',
            size: buffer.byteLength,
            mimeType: mimeType,  // Include mimeType separately
          } as T,
          credits: {
            used: parseInt(response.headers.get('x-credits-consumed') || '0', 10),
            remaining: parseInt(response.headers.get('x-remaining-credits') || '0', 10),
          },
        };
      } else if (responseType === 'json' || (responseType === 'auto' && isJson)) {
        // Handle JSON response
        responseData = await response.json() as SegmindApiResponse<T>;
        
        // Check for API errors
        // Segmind API returns error field when there's an error, not a success field
        if (!response.ok || responseData.error) {
          logger.error('API error response', {
            status: response.status,
            error: responseData.error,
            data: responseData,
          });
          
          const errorMessage = typeof responseData.error === 'string' 
            ? responseData.error 
            : responseData.error?.message || `API request failed with status ${response.status}`;
          
          throw new Error(errorMessage);
        }
        
        // Extract credit information from headers if not in response
        const remainingCredits = response.headers.get('x-remaining-credits');
        if (remainingCredits && !responseData.credits?.remaining) {
          responseData.credits = {
            used: responseData.credits?.used || parseInt(response.headers.get('x-credits-consumed') || '0', 10),
            remaining: parseInt(remainingCredits, 10),
          };
        }
      } else {
        // Unknown response type
        throw new Error(`Unexpected response type: ${contentType}`);
      }
      
      logger.debug('API request successful', {
        responseType: isBinary ? (isImage ? 'image' : isVideo ? 'video' : 'audio') : 'json',
        credits: responseData.credits,
      });
      
      return responseData;
      
    } catch (error) {
      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError();
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError('Failed to connect to Segmind API');
      }
      
      // Re-throw if already a safe error
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      
      // Map to safe error
      throw mapToSafeError(error);
    }
  }
  
  /**
   * Calculate exponential backoff delay
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(2, attempt),
      this.retryConfig.maxDelay,
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    
    return Math.floor(delay + jitter);
  }
  
  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.request('/health', {
        timeout: 5000,
        retries: 1,
      });
      
      return !response.error;
    } catch (error) {
      logger.error('Health check failed', { error });
      return false;
    }
  }
  
  /**
   * Get remaining credits
   */
  async getCredits(): Promise<{ remaining: number; used: number }> {
    const response = await this.request<{ credits: { remaining: number; used: number } }>(
      '/credits',
    );
    
    if (!response.data?.credits) {
      throw new Error('Invalid credits response');
    }
    
    return response.data.credits;
  }
  
  /**
   * Generate image using model endpoint
   */
  async generateImage(model: string, params: any): Promise<SegmindApiResponse<any>> {
    // Map model names to Segmind endpoint format
    // Note: These are the confirmed working endpoints
    const modelEndpointMap: Record<string, string> = {
      'sdxl': '/sdxl1.0-txt2img',
      'sdxl-img2img': '/sdxl1.0-img2img',
      'sd15-img2img': '/sd1.5-img2img',
      'esrgan': '/esrgan',
      // Note: Other working models use their ID as endpoint directly
    };
    
    const endpoint = modelEndpointMap[model] || `/${model}`;
    
    return this.request(endpoint, {
      method: 'POST',
      body: params,
      responseType: 'auto',
    });
  }
}

// Export singleton instance
export const apiClient = new SegmindApiClient();