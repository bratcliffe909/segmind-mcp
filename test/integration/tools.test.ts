import { describe, it, expect, beforeAll } from '@jest/globals';
import { GenerateImageTool } from '../../src/tools/generate-image.js';
import { TransformImageTool } from '../../src/tools/transform-image.js';
import { GenerateVideoTool } from '../../src/tools/generate-video.js';
import { EnhanceImageTool } from '../../src/tools/enhance-image.js';
import { SpecializedGenerationTool } from '../../src/tools/specialized-generation.js';

// Mock the API client module
jest.mock('../../src/api/client', () => ({
  apiClient: {
    request: jest.fn().mockResolvedValue({
      success: true,
      data: {
        image: 'data:image/png;base64,mockbase64data',
        video: 'https://example.com/video.mp4',
        audio: 'data:audio/mp3;base64,mockaudiodata',
        format: 'png',
        size: 1024,
        duration: 5,
      },
      credits: { used: 1, remaining: 100 },
    }),
    generateImage: jest.fn().mockResolvedValue({
      success: true,
      data: {
        image: 'data:image/png;base64,mockbase64data',
        format: 'png',
        size: 1024,
      },
      credits: { used: 1, remaining: 100 },
    }),
    getCredits: jest.fn().mockResolvedValue({
      remaining: 100,
      used: 50,
    }),
  },
}));

describe('Tool Integration Tests', () => {
  beforeAll(() => {
    // Model registry is initialized automatically
  });

  describe('GenerateImageTool', () => {
    it('should generate an image with valid parameters', async () => {
      const tool = new GenerateImageTool();
      
      const result = await tool.execute({
        prompt: 'A beautiful landscape',
        num_images: 1,
      });
      
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      
      // Should have an image and credit info
      const imageContent = result.content.find(c => c.type === 'image');
      expect(imageContent).toBeDefined();
    });
    
    it('should handle model selection', async () => {
      const tool = new GenerateImageTool();
      
      const result = await tool.execute({
        prompt: 'A portrait',
        model: 'sdxl',
        num_images: 1,
      });
      
      expect(result).toHaveProperty('content');
      const textContent = result.content.find(c => c.type === 'text' && c.text.includes('Stable Diffusion XL'));
      expect(textContent).toBeDefined();
    });
  });

  describe('TransformImageTool', () => {
    it('should transform an image', async () => {
      const tool = new TransformImageTool();
      
      const result = await tool.execute({
        image: 'data:image/png;base64,mockbase64input',
        prompt: 'Make it more colorful',
      });
      
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
    });
  });

  describe('GenerateVideoTool', () => {
    it('should generate a video URL', async () => {
      const tool = new GenerateVideoTool();
      
      const result = await tool.execute({
        prompt: 'A flying bird',
        duration: 3,
      });
      
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
    });
  });

  describe('EnhanceImageTool', () => {
    it('should enhance an image', async () => {
      const tool = new EnhanceImageTool();
      
      const result = await tool.execute({
        image: 'data:image/png;base64,mockbase64input',
        enhancement_type: 'upscale',
      });
      
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
    });
  });

  describe('SpecializedGenerationTool', () => {
    it('should generate specialized content', async () => {
      const tool = new SpecializedGenerationTool();
      
      const result = await tool.execute({
        type: '3d',
        prompt: 'A 3D model of a chair',
      });
      
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
    });
  });
});