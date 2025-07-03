/**
 * Type definitions for Segmind MCP Server
 */

// Re-export MCP types
export type {
  Tool,
  Resource,
  Prompt,
  CallToolRequest,
  CallToolResult,
  ReadResourceRequest,
  ReadResourceResult,
  GetPromptRequest,
  GetPromptResult,
  ListToolsRequest,
  ListResourcesRequest,
  ListPromptsRequest,
} from '@modelcontextprotocol/sdk/types.js';

// Segmind API types
export interface SegmindModel {
  id: string;
  name: string;
  description: string;
  category: 'text2img' | 'img2img' | 'video' | 'utility';
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  pricing: {
    creditsPerGeneration: number;
  };
  limitations?: {
    maxWidth?: number;
    maxHeight?: number;
    maxDuration?: number;
  };
}

export interface SegmindApiResponse<T = unknown> {
  // Segmind API doesn't return success field, presence of error indicates failure
  data?: T;
  error?: string | {
    message: string;
    code?: string;
  };
  credits?: {
    used: number;
    remaining: number;
  };
  metadata?: Record<string, any>;
  // For image responses
  image?: string;
  // For video responses  
  video_url?: string;
  // For status responses
  status?: string;
}

export interface ImageGenerationParams {
  model: string;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  seed?: number;
  numOutputs?: number;
  scheduler?: string;
  outputFormat?: 'png' | 'jpeg' | 'webp';
}

export interface ImageToImageParams extends ImageGenerationParams {
  inputImage: string; // base64 or URL
  strength?: number;
}

export interface VideoGenerationParams {
  model: string;
  prompt: string;
  inputImage?: string;
  duration?: number;
  fps?: number;
  width?: number;
  height?: number;
}

export interface GeneratedImage {
  url: string;
  base64?: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface GeneratedVideo {
  url: string;
  duration: number;
  fps: number;
  width: number;
  height: number;
  format: string;
}

// MCP Tool Parameters
export interface GenerateImageToolParams {
  model?: string;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  seed?: number;
  outputFormat?: 'png' | 'jpeg' | 'webp';
}

export interface ImageToImageToolParams {
  model?: string;
  inputImage: string;
  prompt: string;
  negativePrompt?: string;
  strength?: number;
  width?: number;
  height?: number;
  outputFormat?: 'png' | 'jpeg' | 'webp';
}

export interface GenerateVideoToolParams {
  model?: string;
  prompt: string;
  inputImage?: string;
  duration?: number;
  fps?: number;
  width?: number;
  height?: number;
}

// Utility types
export interface ImageValidationResult {
  isValid: boolean;
  format?: string;
  width?: number;
  height?: number;
  size?: number;
  error?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Server state
export interface ServerState {
  isInitialized: boolean;
  modelsLoaded: boolean;
  activeRequests: number;
  rateLimits: Map<string, RateLimitInfo>;
}