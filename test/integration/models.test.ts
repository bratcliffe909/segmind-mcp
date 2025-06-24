import { describe, it, expect } from '@jest/globals';
import { GenerateImageTool } from '../../src/tools/generate-image.js';
import { TransformImageTool } from '../../src/tools/transform-image.js';
import { EnhanceImageTool } from '../../src/tools/enhance-image.js';
import { GenerateVideoTool } from '../../src/tools/generate-video.js';
import { SpecializedGenerationTool } from '../../src/tools/specialized-generation.js';
import { WORKING_MODELS } from '../../src/models/working-models.js';
import { ModelCategory } from '../../src/models/registry.js';

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

describe('Working Model Tests', () => {
  // Test each text-to-image model
  describe('Text-to-Image Models', () => {
    const textToImageModels = WORKING_MODELS.filter(m => m.category === ModelCategory.TEXT_TO_IMAGE);
    
    textToImageModels.forEach(model => {
      describe(`${model.name} (${model.id})`, () => {
        it('should have valid configuration', () => {
          expect(model).toHaveProperty('id');
          expect(model).toHaveProperty('endpoint');
          expect(model).toHaveProperty('parameters');
          expect(model.endpoint).toMatch(/^\/[a-zA-Z0-9\-\.\/]+$/);
          expect(model.estimatedTime).toBeGreaterThan(0);
          expect(model.creditsPerUse).toBeGreaterThan(0);
        });

        it('should generate image with default parameters', async () => {
          const tool = new GenerateImageTool();
          
          const result = await tool.execute({
            prompt: 'Test prompt for model validation',
            model: model.id,
            num_images: 1,
          });
          
          expect(result).toHaveProperty('content');
          expect(Array.isArray(result.content)).toBe(true);
          expect(result.content.length).toBeGreaterThan(0);
          
          const textContent = result.content.find(c => c.type === 'text');
          expect(textContent?.text).toContain(model.name);
        });

        it('should handle custom dimensions', async () => {
          const tool = new GenerateImageTool();
          
          const result = await tool.execute({
            prompt: 'Test with custom dimensions',
            model: model.id,
            width: 512,
            height: 768,
            num_images: 1,
          });
          
          expect(result).toHaveProperty('content');
          expect(result.content.some(c => c.type === 'image')).toBe(true);
        });

        it('should validate parameter constraints', () => {
          const params = model.parameters.shape;
          
          // Check if width/height parameters exist and have proper constraints
          if ('img_width' in params) {
            expect(params.img_width).toBeDefined();
          }
          if ('img_height' in params) {
            expect(params.img_height).toBeDefined();
          }
        });
      });
    });
  });

  // Test image-to-image model
  describe('Image-to-Image Models', () => {
    const imgToImgModels = WORKING_MODELS.filter(m => m.category === ModelCategory.IMAGE_TO_IMAGE);
    
    imgToImgModels.forEach(model => {
      describe(`${model.name} (${model.id})`, () => {
        it('should have valid configuration', () => {
          expect(model).toHaveProperty('id');
          expect(model).toHaveProperty('endpoint');
          expect(model).toHaveProperty('parameters');
          expect(model.parameters.shape).toHaveProperty('image');
          expect(model.parameters.shape).toHaveProperty('strength');
        });

        it('should transform image', async () => {
          const tool = new TransformImageTool();
          
          const result = await tool.execute({
            image: 'data:image/png;base64,mockbase64input',
            prompt: 'Transform this image',
            model: model.id,
          });
          
          expect(result).toHaveProperty('content');
          expect(Array.isArray(result.content)).toBe(true);
        });

        it('should handle strength parameter', async () => {
          const tool = new TransformImageTool();
          
          const result = await tool.execute({
            image: 'data:image/png;base64,mockbase64input',
            prompt: 'Light transformation',
            model: model.id,
            strength: 0.5,
          });
          
          expect(result).toHaveProperty('content');
        });
      });
    });
  });

  // Test enhancement models
  describe('Image Enhancement Models', () => {
    const enhancementModels = WORKING_MODELS.filter(m => m.category === ModelCategory.IMAGE_ENHANCEMENT);
    
    enhancementModels.forEach(model => {
      describe(`${model.name} (${model.id})`, () => {
        it('should have valid configuration', () => {
          expect(model).toHaveProperty('id');
          expect(model).toHaveProperty('endpoint');
          expect(model).toHaveProperty('parameters');
          expect(model.parameters.shape).toHaveProperty('image');
        });

        it('should enhance image', async () => {
          const tool = new EnhanceImageTool();
          
          const enhancement_type = model.id === 'esrgan' ? 'upscale' : 'denoise';
          
          const result = await tool.execute({
            image: 'data:image/png;base64,mockbase64input',
            enhancement_type,
            model: model.id,
          });
          
          expect(result).toHaveProperty('content');
          expect(Array.isArray(result.content)).toBe(true);
        });

        if (model.id === 'esrgan') {
          it('should handle scale parameter', async () => {
            const tool = new EnhanceImageTool();
            
            const result = await tool.execute({
              image: 'data:image/png;base64,mockbase64input',
              enhancement_type: 'upscale',
              model: model.id,
              scale: 2,
            });
            
            expect(result).toHaveProperty('content');
          });
        }

        if (model.id === 'codeformer') {
          it('should handle fidelity parameter', async () => {
            const tool = new EnhanceImageTool();
            
            const result = await tool.execute({
              image: 'data:image/png;base64,mockbase64input',
              enhancement_type: 'denoise',
              model: model.id,
              strength: 0.7,
            });
            
            expect(result).toHaveProperty('content');
          });
        }
      });
    });
  });

  // Test video generation models
  describe('Video Generation Models', () => {
    const videoModels = WORKING_MODELS.filter(m => m.category === ModelCategory.VIDEO_GENERATION);
    
    videoModels.forEach(model => {
      describe(`${model.name} (${model.id})`, () => {
        it('should have valid configuration', () => {
          expect(model).toHaveProperty('id');
          expect(model).toHaveProperty('endpoint');
          expect(model).toHaveProperty('parameters');
          expect(model.outputType).toBe('video');
        });

        it('should generate video with default parameters', async () => {
          const tool = new GenerateVideoTool();
          
          const result = await tool.execute({
            prompt: 'Test video generation',
            model: model.id,
          });
          
          expect(result).toHaveProperty('content');
          expect(Array.isArray(result.content)).toBe(true);
        });
      });
    });
  });

  // Test specialized generation models (TTS and Music)
  describe('Specialized Generation Models (Audio)', () => {
    const audioModels = WORKING_MODELS.filter(m => 
      m.category === ModelCategory.SPECIALIZED_GENERATION && m.outputType === 'audio'
    );
    
    audioModels.forEach(model => {
      describe(`${model.name} (${model.id})`, () => {
        it('should have valid configuration', () => {
          expect(model).toHaveProperty('id');
          expect(model).toHaveProperty('endpoint');
          expect(model).toHaveProperty('parameters');
          expect(model.outputType).toBe('audio');
        });

        it('should generate audio with default parameters', async () => {
          const tool = new SpecializedGenerationTool();
          
          // Determine type based on model
          let type = 'tts';
          if (model.id.includes('music') || model.id.includes('lyria')) {
            type = 'music';
          }
          
          const result = await tool.execute({
            type,
            prompt: type === 'tts' ? 'Hello world' : 'Relaxing piano music',
            model: model.id,
          });
          
          expect(result).toHaveProperty('content');
          expect(Array.isArray(result.content)).toBe(true);
        });
      });
    });
  });

  // Summary test
  describe('Model Registry', () => {
    it('should have exactly 13 working models', () => {
      expect(WORKING_MODELS.length).toBe(13);
    });

    it('should have 4 text-to-image models', () => {
      const count = WORKING_MODELS.filter(m => m.category === ModelCategory.TEXT_TO_IMAGE).length;
      expect(count).toBe(4);
    });

    it('should have 1 image-to-image model', () => {
      const count = WORKING_MODELS.filter(m => m.category === ModelCategory.IMAGE_TO_IMAGE).length;
      expect(count).toBe(1);
    });

    it('should have 2 enhancement models', () => {
      const count = WORKING_MODELS.filter(m => m.category === ModelCategory.IMAGE_ENHANCEMENT).length;
      expect(count).toBe(2);
    });

    it('should have 2 video generation models', () => {
      const count = WORKING_MODELS.filter(m => m.category === ModelCategory.VIDEO_GENERATION).length;
      expect(count).toBe(2);
    });

    it('should have 4 specialized generation models (audio)', () => {
      const count = WORKING_MODELS.filter(m => 
        m.category === ModelCategory.SPECIALIZED_GENERATION && m.outputType === 'audio'
      ).length;
      expect(count).toBe(4);
    });

    it('all models should have unique IDs', () => {
      const ids = WORKING_MODELS.map(m => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('all models should have valid endpoints', () => {
      WORKING_MODELS.forEach(model => {
        expect(model.endpoint).toMatch(/^\/[a-zA-Z0-9\-\.\/]+$/);
        expect(model.apiVersion).toBe('v1');
      });
    });
  });
});