import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Configuration', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    // Reset modules before each test
    jest.resetModules();
    
    // Create a copy of the original env
    process.env = { ...originalEnv };
  });
  
  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });
  
  it('should load valid configuration', () => {
    process.env.SEGMIND_API_KEY = 'sg_test123456789';
    
    // Re-import to get fresh instance
    const { config } = require('../../../src/utils/config');
    
    expect(config).toBeDefined();
    expect(config.apiKey).toBe('sg_test123456789');
    expect(config.baseUrl).toBe('https://api.segmind.com/v1');
    expect(config.nodeEnv).toBe('test');
  });
  
  it('should throw error for invalid API key format', () => {
    process.env.SEGMIND_API_KEY = 'invalid_key';
    
    // Reset the config module
    const configModule = require('../../../src/utils/config');
    configModule.resetConfig();
    
    expect(() => {
      configModule.ConfigurationLoader.load();
    }).toThrow('Configuration validation failed');
  });
  
  it('should throw error for missing API key', () => {
    delete process.env.SEGMIND_API_KEY;
    
    // Reset the config module
    const configModule = require('../../../src/utils/config');
    configModule.resetConfig();
    
    expect(() => {
      configModule.ConfigurationLoader.load();
    }).toThrow('Configuration validation failed');
  });
  
  it('should mask API key correctly', () => {
    const { getMaskedApiKey } = require('../../../src/utils/config');
    
    expect(getMaskedApiKey('sg_test123456789')).toBe('sg_tes...6789');
    expect(getMaskedApiKey('short')).toBe('[INVALID]');
    expect(getMaskedApiKey('')).toBe('[INVALID]');
  });
  
  it('should use default values when optional env vars are not set', () => {
    process.env.SEGMIND_API_KEY = 'sg_test123456789';
    delete process.env.CACHE_ENABLED;
    delete process.env.LOG_LEVEL;
    
    const configModule = require('../../../src/utils/config');
    configModule.resetConfig();
    const { config } = configModule;
    
    expect(config.cache.enabled).toBe(true);
    expect(config.logLevel).toBe('error'); // In test environment it's set to 'error'
    expect(config.defaultModels.text2img).toBe('sdxl');
  });
});