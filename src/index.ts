#!/usr/bin/env node

import { server } from './server.js';
import { config } from './utils/config.js';
import { ConfigurationError } from './utils/errors.js';
import { logger } from './utils/logger.js';

/**
 * Test API configuration
 */
function testApiConfig(): void {
  console.log('🧪 Testing Segmind API Configuration...\n');
  
  const apiKey = config.apiKey || process.env.SEGMIND_API_KEY;
  
  if (!apiKey) {
    console.error('❌ Error: SEGMIND_API_KEY not found');
    console.error('   Please set it in your MCP configuration or environment');
    process.exit(1);
  }
  
  console.log(`📝 API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log('\n1️⃣ Checking API key format...');
  
  if (apiKey.match(/^(sg_|SG_)[a-zA-Z0-9]{12,}$/)) {
    console.log('✅ API key format is valid!');
    console.log('\n✨ Configuration test passed! Your Segmind MCP Server is ready to use.');
    process.exit(0);
  } else {
    console.error('❌ Invalid API key format');
    console.error('   API key should start with sg_ or SG_ followed by alphanumeric characters');
    process.exit(1);
  }
}

/**
 * Main entry point for the Segmind MCP Server
 */
async function main(): Promise<void> {
  // Handle test-api command
  if (process.argv[2] === 'test-api') {
    testApiConfig();
    return;
  }
  
  try {
    // Validate configuration
    if (!config.apiKey) {
      throw new ConfigurationError(
        'SEGMIND_API_KEY environment variable is required. ' +
        'Please set it to your Segmind API key.',
      );
    }
    
    // Set up graceful shutdown handlers
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      
      try {
        await server.shutdown();
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };
    
    // Register shutdown handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error });
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      process.exit(1);
    });
    
    // Start the server
    await server.start();
    
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Run the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}