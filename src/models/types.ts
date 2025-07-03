import { z } from 'zod';

export enum ModelCategory {
  TEXT_TO_IMAGE = 'text2img',
  IMAGE_TO_IMAGE = 'img2img',
  VIDEO_GENERATION = 'video',
  IMAGE_ENHANCEMENT = 'enhancement',
  SPECIALIZED_GENERATION = 'specialized',
}

export enum OutputType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  TEXT = 'text',
}

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  category: ModelCategory;
  endpoint: string;
  apiVersion: 'v1' | 'v2';
  outputType: OutputType;
  estimatedTime: number; // in seconds
  creditsPerUse: number;
  parameters: z.ZodObject<any>;
  defaultParams?: Record<string, any>;
  supportedFormats?: string[];
  maxDimensions?: {
    width: number;
    height: number;
  };
}