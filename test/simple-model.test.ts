import { describe, it, expect } from '@jest/globals';
import { modelRegistry } from '../src/models/registry.js';

describe('Simple Model Test', () => {
  it('should load all 13 models', () => {
    const models = modelRegistry.getAllModels();
    expect(models.length).toBe(13);
  });
  
  it('should have SDXL model', () => {
    const sdxl = modelRegistry.getModel('sdxl');
    expect(sdxl).toBeDefined();
    expect(sdxl?.name).toBe('Stable Diffusion XL');
  });
});