/**
 * Custom error classes for Segmind MCP Server
 * Provides safe error handling without exposing internal details
 */

export enum ErrorCode {
  // Authentication errors
  INVALID_API_KEY = 'INVALID_API_KEY',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  
  // API errors
  API_ERROR = 'API_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  
  // Model errors
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  MODEL_NOT_AVAILABLE = 'MODEL_NOT_AVAILABLE',
  
  // Generation errors
  GENERATION_FAILED = 'GENERATION_FAILED',
  GENERATION_TIMEOUT = 'GENERATION_TIMEOUT',
  
  // Input errors
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_IMAGE_FORMAT = 'INVALID_IMAGE_FORMAT',
  IMAGE_TOO_LARGE = 'IMAGE_TOO_LARGE',
  
  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}

/**
 * Base error class with safe user messages
 */
export class SafeError extends Error {
  constructor(
    public readonly userMessage: string,
    public readonly code: ErrorCode,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(userMessage);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
  
  /**
   * Convert to a safe JSON representation for API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      error: this.userMessage,
      code: this.code,
      statusCode: this.statusCode,
      // Only include details in development mode
      ...(process.env.NODE_ENV === 'development' && this.details ? { details: this.details } : {}),
    };
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends SafeError {
  constructor(message = 'Authentication failed', details?: Record<string, unknown>) {
    super(message, ErrorCode.AUTHENTICATION_FAILED, 401, details);
  }
}

/**
 * Invalid API key error
 */
export class InvalidApiKeyError extends SafeError {
  constructor(message = 'Invalid or missing API key', details?: Record<string, unknown>) {
    super(message, ErrorCode.INVALID_API_KEY, 401, details);
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends SafeError {
  constructor(message = 'Rate limit exceeded. Please try again later.', details?: Record<string, unknown>) {
    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, details);
  }
}

/**
 * Insufficient credits error
 */
export class InsufficientCreditsError extends SafeError {
  constructor(message = 'Insufficient credits for this operation', details?: Record<string, unknown>) {
    super(message, ErrorCode.INSUFFICIENT_CREDITS, 402, details);
  }
}

/**
 * Model not found error
 */
export class ModelNotFoundError extends SafeError {
  constructor(modelId: string, details?: Record<string, unknown>) {
    super(`Model '${modelId}' not found`, ErrorCode.MODEL_NOT_FOUND, 404, details);
  }
}

/**
 * Generation failed error
 */
export class GenerationError extends SafeError {
  constructor(message = 'Failed to generate content', details?: Record<string, unknown>) {
    super(message, ErrorCode.GENERATION_FAILED, 500, details);
  }
}

/**
 * Invalid input error
 */
export class InvalidInputError extends SafeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.INVALID_INPUT, 400, details);
  }
}

/**
 * Network error
 */
export class NetworkError extends SafeError {
  constructor(message = 'Network error occurred', details?: Record<string, unknown>) {
    super(message, ErrorCode.NETWORK_ERROR, 503, details);
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends SafeError {
  constructor(message = 'Request timed out', details?: Record<string, unknown>) {
    super(message, ErrorCode.TIMEOUT_ERROR, 504, details);
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends SafeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.CONFIGURATION_ERROR, 500, details);
  }
}

/**
 * Map unknown errors to safe errors
 */
export function mapToSafeError(error: unknown): SafeError {
  // If already a safe error, return it
  if (error instanceof SafeError) {
    return error;
  }
  
  // Handle specific error types
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Map known error patterns
    if (message.includes('api key') || message.includes('authorization')) {
      return new AuthenticationError();
    }
    
    if (message.includes('rate limit')) {
      return new RateLimitError();
    }
    
    if (message.includes('credits')) {
      return new InsufficientCreditsError();
    }
    
    if (message.includes('timeout')) {
      return new TimeoutError();
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return new NetworkError();
    }
    
    // Log the original error for debugging (in production, this would go to a secure log)
    if (process.env.NODE_ENV === 'development' && process.env.MCP_MODE !== 'true') {
      console.error('Original error:', error);
    }
  }
  
  // For other errors, include the actual error message
  let errorMessage = 'An error occurred processing your request';
  if (error instanceof Error) {
    errorMessage = error.message || errorMessage;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }
  
  // Default to internal error with actual message
  return new SafeError(
    errorMessage,
    ErrorCode.INTERNAL_ERROR,
    500,
  );
}

/**
 * Error response formatter for MCP
 */
export function formatErrorResponse(error: SafeError): Record<string, unknown> {
  return {
    error: {
      code: error.code,
      message: error.userMessage,
      data: error.details,
    },
  };
}