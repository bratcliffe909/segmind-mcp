import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Configuration schema with validation
const ConfigSchema = z.object({
  // API Configuration
  apiKey: z.string().min(1).regex(/^(sg_|SG_)[a-zA-Z0-9]{12,}$/, 'Invalid Segmind API key format'),
  baseUrl: z.string().url().default('https://api.segmind.com/v1'),
  
  // Server Configuration
  nodeEnv: z.enum(['development', 'production', 'test']).default('production'),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Default Models
  defaultModels: z.object({
    text2img: z.string().default('sdxl'),
    img2img: z.string().default('sdxl-img2img'),
    video: z.string().default('veo-3'),
  }),
  
  // Performance Settings
  cache: z.object({
    enabled: z.boolean().default(true),
    ttl: z.number().min(0).default(3600), // seconds
    maxSize: z.number().min(0).default(100), // MB
  }),
  
  limits: z.object({
    maxImageSize: z.number().min(1).default(10 * 1024 * 1024), // 10MB
    maxBatchSize: z.number().min(1).default(5),
    requestTimeout: z.number().min(1000).default(120000), // 2 minutes
    maxConcurrentRequests: z.number().min(1).default(10),
  }),
  
  // Security Settings
  security: z.object({
    validateInputs: z.boolean().default(true),
    sanitizeLogs: z.boolean().default(true),
    allowedImageFormats: z.array(z.string()).default(['png', 'jpeg', 'jpg', 'webp']),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

class ConfigurationLoader {
  private static instance: Config | null = null;
  
  /**
   * Load and validate configuration from environment variables
   */
  static load(): Config {
    if (this.instance) {
      return this.instance;
    }
    
    try {
      const rawConfig = {
        // API Configuration
        apiKey: process.env.SEGMIND_API_KEY || '',
        baseUrl: process.env.SEGMIND_BASE_URL,
        
        // Server Configuration
        nodeEnv: process.env.NODE_ENV,
        logLevel: process.env.LOG_LEVEL,
        
        // Default Models
        defaultModels: {
          text2img: process.env.DEFAULT_TEXT2IMG_MODEL,
          img2img: process.env.DEFAULT_IMG2IMG_MODEL,
          video: process.env.DEFAULT_VIDEO_MODEL,
        },
        
        // Performance Settings
        cache: {
          enabled: process.env.CACHE_ENABLED !== undefined ? process.env.CACHE_ENABLED === 'true' : undefined,
          ttl: process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL, 10) : undefined,
          maxSize: process.env.CACHE_MAX_SIZE ? parseInt(process.env.CACHE_MAX_SIZE, 10) : undefined,
        },
        
        limits: {
          maxImageSize: process.env.MAX_IMAGE_SIZE ? parseInt(process.env.MAX_IMAGE_SIZE, 10) : undefined,
          maxBatchSize: process.env.MAX_BATCH_SIZE ? parseInt(process.env.MAX_BATCH_SIZE, 10) : undefined,
          requestTimeout: process.env.REQUEST_TIMEOUT ? parseInt(process.env.REQUEST_TIMEOUT, 10) : undefined,
          maxConcurrentRequests: process.env.MAX_CONCURRENT_REQUESTS ? parseInt(process.env.MAX_CONCURRENT_REQUESTS, 10) : undefined,
        },
        
        // Security Settings
        security: {
          validateInputs: process.env.VALIDATE_INPUTS !== 'false',
          sanitizeLogs: process.env.SANITIZE_LOGS !== 'false',
          allowedImageFormats: process.env.ALLOWED_IMAGE_FORMATS?.split(','),
        },
      };
      
      // Parse and validate configuration
      this.instance = ConfigSchema.parse(rawConfig);
      return this.instance;
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        throw new Error(`Configuration validation failed: ${issues}`);
      }
      throw error;
    }
  }
  
  /**
   * Reset configuration (mainly for testing)
   */
  static reset(): void {
    this.instance = null;
  }
  
  /**
   * Get masked API key for logging
   */
  static getMaskedApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 10) {
      return '[INVALID]';
    }
    return `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`;
  }
}

// Lazy-load configuration to avoid eager validation
let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    _config = ConfigurationLoader.load();
  }
  return _config;
}

// For backwards compatibility, create a getter-based config object
export const config = new Proxy({} as Config, {
  get(_, prop) {
    return getConfig()[prop as keyof Config];
  }
});

export const getMaskedApiKey = (apiKey: string) => ConfigurationLoader.getMaskedApiKey(apiKey);
export const resetConfig = () => {
  ConfigurationLoader.reset();
  _config = null;
};
export { ConfigurationLoader };