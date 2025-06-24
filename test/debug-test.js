// Debug test to understand the issue
import { GenerateImageTool } from '../dist/tools/generate-image.js';

const tool = new GenerateImageTool();

async function test() {
  try {
    const result = await tool.execute({
      prompt: 'Test prompt',
      model: 'sdxl',
      num_images: 1,
    });
    
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

test();