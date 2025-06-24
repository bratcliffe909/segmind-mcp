import { describe, it, expect } from '@jest/globals';
import { GenerateImageTool } from '../src/tools/generate-image.js';
import { WORKING_MODELS } from '../src/models/working-models.js';

// Mock the API client module
jest.mock('../src/api/client', () => ({
  apiClient: {
    request: jest.fn().mockResolvedValue({
      success: true,
      data: {
        image: 'data:image/png;base64,mockbase64data',
        format: 'png',
        size: 1024,
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

describe('Debug Mock Test', () => {
  it('should generate image with SDXL', async () => {
    const tool = new GenerateImageTool();
    const model = WORKING_MODELS.find(m => m.id === 'sdxl');
    
    console.log('Model:', model);
    
    try {
      const result = await tool.execute({
        prompt: 'Test prompt',
        model: 'sdxl',
        num_images: 1,
      });
      
      console.log('Result:', JSON.stringify(result, null, 2));
      
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  });
});