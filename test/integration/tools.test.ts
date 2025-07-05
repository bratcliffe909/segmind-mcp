import { describe, it, expect, beforeAll } from '@jest/globals';
import { GenerateImageTool } from '../../src/tools/generate-image.js';
import { TransformImageTool } from '../../src/tools/transform-image.js';
import { GenerateVideoTool } from '../../src/tools/generate-video.js';
import { EnhanceImageTool } from '../../src/tools/enhance-image.js';
import { GenerateAudioTool } from '../../src/tools/generate-audio.js';
import { GenerateMusicTool } from '../../src/tools/generate-music.js';

// Mock fs module
jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
}));

// Mock the API client module
jest.mock('../../src/api/client', () => ({
  apiClient: {
    request: jest.fn().mockResolvedValue({
      data: {
        image: 'mockbase64data',
        video: 'mockvideo64data',
        audio: 'mockaudio64data',
        format: 'png',
        size: 1024,
        mimeType: 'image/png',
        duration: 5,
      },
      credits: { used: 1, remaining: 100 },
    }),
    generateImage: jest.fn().mockResolvedValue({
      data: {
        image: 'mockbase64data',
        format: 'png',
        size: 1024,
        mimeType: 'image/png',
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
      
      // Should have text content about the saved image
      const textContent = result.content.find(c => c.type === 'text');
      expect(textContent).toBeDefined();
    });
    
    it.skip('should handle model selection', async () => {
      const tool = new GenerateImageTool();
      
      const result = await tool.execute({
        prompt: 'A portrait',
        model: 'sdxl',
        num_images: 1,
      });
      
      expect(result).toHaveProperty('content');
      // Should mention the model name in the output
      const textContent = result.content.find(c => c.type === 'text' && c.text.includes('using'));
      expect(textContent).toBeDefined();
      expect(textContent?.text).toContain('Stable Diffusion XL');
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

  describe('GenerateAudioTool', () => {
    it('should generate audio from text', async () => {
      const tool = new GenerateAudioTool();
      
      const result = await tool.execute({
        text: 'Hello world',
      });
      
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
    });
  });

  describe('GenerateMusicTool', () => {
    it('should generate music from prompt', async () => {
      const tool = new GenerateMusicTool();
      
      const result = await tool.execute({
        prompt: 'Upbeat electronic dance music',
      });
      
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
    });
  });
});