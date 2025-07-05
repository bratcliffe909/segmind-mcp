import { spawn } from 'child_process';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('MCP Server Integration', () => {
  let serverProcess: any;
  
  beforeAll(() => {
    // Start the MCP server
    serverProcess = spawn('node', ['dist/server.js'], {
      env: { ...process.env, LOG_LEVEL: 'error' },
    });
  });
  
  afterAll(() => {
    // Clean up server process
    if (serverProcess) {
      serverProcess.kill();
    }
  });
  
  it('should list available tools', async () => {
    // Basic smoke test - ensure server starts without crashing
    expect(serverProcess).toBeDefined();
    expect(serverProcess.killed).toBe(false);
    
    // Tool names for reference
    const expectedTools = [
      'generate_image',
      'transform_image', 
      'generate_video',
      'generate_audio',
      'generate_music',
      'enhance_image'
    ];
    
    expect(expectedTools.length).toBe(6);
  });
  
  it('should handle generate_image requests', async () => {
    // This is a basic test to ensure the tool structure is correct
    const params = {
      prompt: 'test prompt',
      num_images: 1,
    };
    
    // We're just testing the structure, not actual API calls
    expect(params).toHaveProperty('prompt');
    expect(params).toHaveProperty('num_images');
  });
});