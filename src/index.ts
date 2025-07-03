#!/usr/bin/env node

// Set MCP mode IMMEDIATELY before any imports to prevent console output
if (process.argv[2] !== 'test-api') {
  process.env.MCP_MODE = 'true';
}

import { server } from './server.js';
import { config } from './utils/config.js';

/**
 * Test API configuration - only used for manual testing, not in MCP mode
 */
function testApiConfig(): void {
  // This function is only for manual testing, not for MCP mode
  if (process.env.MCP_MODE === 'true') {
    process.exit(1); // Exit immediately if accidentally called in MCP mode
  }
  
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
    // Only show debug info if DEBUG env var is set
    if (process.env.DEBUG) {
      console.error('[Debug] Environment check:');
      console.error(`[Debug] SEGMIND_API_KEY exists: ${!!process.env.SEGMIND_API_KEY}`);
      console.error(`[Debug] SEGMIND_API_KEY length: ${process.env.SEGMIND_API_KEY?.length || 0}`);
      console.error(`[Debug] First 10 chars: ${process.env.SEGMIND_API_KEY?.substring(0, 10) || 'N/A'}`);
    }
    
    // Validate configuration early but don't exit immediately
    const hasApiKey = !!process.env.SEGMIND_API_KEY;
    if (!hasApiKey && process.env.DEBUG) {
      // Only log warnings in debug mode to avoid stdio interference
      console.error('[Segmind MCP] Warning: SEGMIND_API_KEY not found.');
      console.error('[Segmind MCP] Server will start but API calls will fail.');
      console.error('[Segmind MCP] Please set SEGMIND_API_KEY in your environment or MCP configuration.');
    }
    
    // Set up graceful shutdown handlers first
    const shutdown = async (): Promise<void> => {
      try {
        await server.shutdown();
        process.exit(0);
      } catch (error) {
        process.exit(1);
      }
    };
    
    // Register shutdown handlers
    process.on('SIGTERM', () => shutdown());
    process.on('SIGINT', () => shutdown());
    
    // Don't exit on uncaught errors immediately - avoid console output in MCP mode
    process.on('uncaughtException', async (error) => {
      if (process.env.DEBUG) {
        console.error('Uncaught exception:', error);
      }
      // Try to send error via MCP if server is initialized
      try {
        await server.sendMCPLog('critical', 'Uncaught exception in server', {
          error: error.message,
          stack: error.stack,
        });
      } catch {
        // If MCP logging fails, we can't do anything else
      }
      // Don't exit immediately - let MCP handle it
    });
    
    process.on('unhandledRejection', async (reason) => {
      if (process.env.DEBUG) {
        console.error('Unhandled rejection:', reason);
      }
      // Try to send error via MCP if server is initialized
      try {
        await server.sendMCPLog('critical', 'Unhandled promise rejection', {
          reason: String(reason),
        });
      } catch {
        // If MCP logging fails, we can't do anything else
      }
      // Don't exit immediately - let MCP handle it
    });
    
    // Start the server
    await server.start();
    
    // CRITICAL: Keep the process alive for stdio transport
    // The process must stay running to maintain the stdio connection
    // It will exit via transport.onclose() in server.ts or shutdown handlers
    // This is a no-op that prevents the process from exiting
    await new Promise(() => {
      // This promise never resolves, keeping the process alive
      // The process will exit through:
      // 1. transport.onclose() when the client disconnects
      // 2. SIGTERM/SIGINT handlers
      // 3. transport.onerror() on critical errors
    });
    
  } catch (error) {
    if (process.env.DEBUG) {
      console.error('Failed to start server:', error);
    }
    // Give time for error to be sent via MCP
    setTimeout(() => process.exit(1), 100);
  }
}

// Run the server
// Note: We don't check import.meta.url === process.argv[1] because when run via npx,
// the module is imported rather than executed directly, causing the check to fail.
// This server is designed to be run as a binary, so we always execute main().
main().catch((error) => {
  if (process.env.DEBUG) {
    console.error('Fatal error:', error);
  }
  process.exit(1);
});