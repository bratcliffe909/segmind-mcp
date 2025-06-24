# Test Directory Structure

This directory contains all tests for the Segmind MCP Server.

## Directory Structure

```
test/
├── integration/        # Integration tests for tools and server
│   ├── mcp-server.test.ts
│   ├── server.test.ts
│   └── tools.test.ts
├── unit/              # Unit tests for individual modules
│   └── utils/
│       └── config.test.ts
├── scripts/           # Test scripts for manual testing
│   └── test-api.ts    # API connectivity test
├── output/            # Test output files (gitignored)
│   └── .gitkeep
└── setup.ts           # Jest test setup
```

## Running Tests

### Automated Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:coverage
```

### Manual Test Scripts
```bash
# Test API connectivity
npm run test:api
```

## Test Output

Any files generated during testing (images, videos, etc.) should be saved to the `test/output/` directory. This directory is gitignored to prevent test artifacts from being committed.

## Writing Tests

- **Unit tests** go in `test/unit/` and test individual functions/classes
- **Integration tests** go in `test/integration/` and test multiple components together
- **Test scripts** go in `test/scripts/` for manual testing utilities

All test files should follow the naming convention: `*.test.ts` for automated tests.