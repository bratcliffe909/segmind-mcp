# Segmind MCP Server - System Architecture

## Overview

The Segmind MCP server is built using the Model Context Protocol (MCP) SDK to provide AI assistants with access to Segmind's image and video generation APIs. The architecture follows a modular design pattern for easy maintenance and extensibility.

## Core Components

### 1. MCP Server (`src/server.ts`)

The main entry point that:
- Initializes the MCP server using `@modelcontextprotocol/sdk`
- Registers all available tools
- Handles MCP protocol communication
- Manages server lifecycle

```typescript
// Key responsibilities:
- Tool registration
- Request routing
- Error handling
- Logging setup
```

### 2. API Client (`src/api/client.ts`)

Centralized API communication layer:
- Handles all HTTP requests to Segmind API
- Manages authentication (API key)
- Implements retry logic
- Processes responses and errors
- Handles base64 encoding/decoding

Key methods:
- `request(endpoint, params)` - Generic API request
- `generateImage(model, params)` - Specialized image generation
- `transformImage(params)` - Image transformation
- `enhanceImage(params)` - Image enhancement

### 3. Model Registry (`src/models/`)

Model configuration and management:

**`registry.ts`** - Core types and interfaces:
- `ModelCategory` enum (TEXT_TO_IMAGE, IMAGE_TO_IMAGE, etc.)
- `OutputType` enum (IMAGE, VIDEO, SPECIALIZED)
- `ModelConfig` interface
- Model registry singleton

**`working-models.ts`** - Verified model configurations:
- 7 working models with full parameter schemas
- Zod schemas for parameter validation
- Credit and timing information

### 4. Tools (`src/tools/`)

MCP tool implementations following the protocol specification:

**Base Tool (`base.ts`)**:
- Abstract base class for all tools
- Common functionality (logging, error handling)
- Response formatting

**Tool Implementations**:
1. `generate-image.ts` - Text-to-image generation
2. `transform-image.ts` - Image-to-image transformation
3. `enhance-image.ts` - Image enhancement/upscaling
4. `generate-video.ts` - Video generation (placeholder)
5. `specialized-generation.ts` - QR codes, stickers, etc. (placeholder)

Each tool:
- Validates input parameters
- Selects appropriate model
- Calls API client
- Formats MCP response

### 5. Utilities (`src/utils/`)

Supporting functionality:

**`config.ts`**:
- Environment variable management
- Configuration validation
- Default values

**`logger.ts`**:
- Winston-based logging
- Log levels (error, warn, info, debug)
- Formatted console output

**`errors.ts`**:
- Custom error types
- Error messages
- Error handling utilities

### 6. Types (`src/types/`)

TypeScript type definitions:
- API request/response types
- Tool parameter types
- MCP protocol types
- Shared interfaces

## Data Flow

```
1. AI Assistant → MCP Request → Server
2. Server → Tool Selection → Specific Tool
3. Tool → Parameter Validation → Model Selection
4. Tool → API Client → Segmind API
5. Segmind API → Response → API Client
6. API Client → Process Response → Tool
7. Tool → Format MCP Response → Server
8. Server → MCP Response → AI Assistant
```

## Security Architecture

### API Key Management
- Never hardcoded in source
- Loaded from environment variables
- Validated on startup
- Masked in logs

### Input Validation
- Zod schemas for all parameters
- Boundary checks (dimensions, counts)
- Type validation
- Sanitization of prompts

### Error Handling
- No sensitive data in error messages
- Graceful degradation
- User-friendly error responses
- Detailed internal logging

## Testing Architecture

### Mock Tests (Public)
- No real API calls
- Jest with mocked API client
- Tests tool integration
- Tests parameter validation
- Ensures MCP protocol compliance

### Internal Tests (Private)
- Real API integration
- Separate test directory (gitignored)
- Tests each model individually
- Validates actual responses
- Monitors credit usage

## Build and Deployment

### Build Process
1. TypeScript compilation (`tsc`)
2. Output to `dist/` directory
3. Executable permissions on entry point
4. Type definitions generated

### NPM Package Structure
```
segmind-mcp/
├── dist/          # Compiled JavaScript
├── README.md      # User documentation
├── LICENSE        # MIT license
└── package.json   # Package metadata
```

### MCP Integration
- Runs as subprocess of AI assistant
- Communicates via stdio
- Stateless operation
- Automatic lifecycle management

## Extension Points

### Adding New Models
1. Add configuration to `working-models.ts`
2. Define Zod schema for parameters
3. Test with internal test suite
4. Update documentation

### Adding New Tools
1. Create new tool class extending `BaseTool`
2. Implement required methods
3. Register in `server.ts`
4. Add tests

### Adding New Categories
1. Update `ModelCategory` enum
2. Create appropriate tool
3. Update routing logic
4. Document usage

## Performance Considerations

### Caching
- Currently disabled by default
- Can be enabled via environment
- Respects cache headers
- TTL configuration available

### Rate Limiting
- Handled by Segmind API
- Exponential backoff on 429
- Configurable retry attempts

### Resource Management
- Stateless operation
- No persistent connections
- Memory-efficient streaming
- Automatic cleanup

## Monitoring and Debugging

### Logging
- Structured logging with Winston
- Log levels: error, warn, info, debug
- Timestamp and context included
- No sensitive data logged

### Debug Mode
- Enable with `LOG_LEVEL=debug`
- Detailed request/response logs
- Performance timing
- Memory usage tracking

### Error Tracking
- Standardized error format
- Stack traces in debug mode
- User-friendly messages
- Correlation IDs for requests

## Future Architecture Considerations

1. **Streaming Support**
   - Real-time generation updates
   - Progress indicators
   - Partial results

2. **Batch Processing**
   - Multiple requests in parallel
   - Bulk operations
   - Queue management

3. **Advanced Caching**
   - Redis integration
   - Distributed cache
   - Smart invalidation

4. **Model Discovery**
   - Automatic model detection
   - Dynamic registration
   - Version management