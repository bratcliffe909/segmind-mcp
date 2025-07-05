import { describe, it, expect } from '@jest/globals';
import { GenerateImageTool } from '../../src/tools/generate-image.js';
import { TransformImageTool } from '../../src/tools/transform-image.js';
import { EnhanceImageTool } from '../../src/tools/enhance-image.js';
import { GenerateVideoTool } from '../../src/tools/generate-video.js';
import { GenerateAudioTool } from '../../src/tools/generate-audio.js';
import { GenerateMusicTool } from '../../src/tools/generate-music.js';
import { WORKING_MODELS } from '../../src/models/working-models.js';
import { ModelCategory } from '../../src/models/registry.js';

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
        video_url: 'https://example.com/video.mp4',
        audio_url: 'https://example.com/audio.mp3',
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

        it.skip('should generate image with default parameters', async () => {
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

        it.skip('should handle custom dimensions', async () => {
          const tool = new GenerateImageTool();
          
          const result = await tool.execute({
            prompt: 'Test with custom dimensions',
            model: model.id,
            width: 512,
            height: 768,
            num_images: 1,
          });
          
          expect(result).toHaveProperty('content');
          expect(result.content.some(c => c.type === 'text' && c.text.includes('Image saved to:'))).toBe(true);
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
    const videoModels = WORKING_MODELS.filter(m => m.category === ModelCategory.TEXT_TO_VIDEO);
    
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
      m.category === ModelCategory.TEXT_TO_AUDIO && m.outputType === 'audio'
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
          const tool = new GenerateAudioTool();
          
          const result = await tool.execute({
            text: 'Hello world',
            model: model.id,
          });
          
          expect(result).toHaveProperty('content');
          expect(Array.isArray(result.content)).toBe(true);
        });
      });
    });
  });

  // Music Generation Model Tests
  describe('Music Generation Models', () => {
    const musicModels = WORKING_MODELS.filter(
      m => m.category === ModelCategory.TEXT_TO_MUSIC && m.outputType === 'audio'
    );
    
    musicModels.forEach(model => {
      describe(`${model.name} (${model.id})`, () => {
        it('should have valid configuration', () => {
          expect(model).toHaveProperty('id');
          expect(model).toHaveProperty('endpoint');
          expect(model).toHaveProperty('parameters');
          expect(model.outputType).toBe('audio');
        });

        it('should generate music with default parameters', async () => {
          const tool = new GenerateMusicTool();
          
          const result = await tool.execute({
            prompt: 'Relaxing piano music',
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
      const count = WORKING_MODELS.filter(m => m.category === ModelCategory.TEXT_TO_VIDEO).length;
      expect(count).toBe(2);
    });

    it('should have 2 text-to-audio (TTS) models', () => {
      const count = WORKING_MODELS.filter(m => 
        m.category === ModelCategory.TEXT_TO_AUDIO && m.outputType === 'audio'
      ).length;
      expect(count).toBe(2);
    });

    it('should have 2 text-to-music models', () => {
      const count = WORKING_MODELS.filter(m => 
        m.category === ModelCategory.TEXT_TO_MUSIC && m.outputType === 'audio'
      ).length;
      expect(count).toBe(2);
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