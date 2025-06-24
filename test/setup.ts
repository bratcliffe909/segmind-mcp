// Jest test setup file
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Ensure a valid mock API key is set for tests
if (!process.env.SEGMIND_API_KEY || !process.env.SEGMIND_API_KEY.match(/^(sg_|SG_)[a-zA-Z0-9]{12,}$/)) {
  process.env.SEGMIND_API_KEY = 'sg_mocktestapi12345678';
}

// Mock winston to avoid log output during tests
jest.mock('winston', () => {
  const mockFormat = (fn?: any) => {
    const formatted = { transform: fn || (() => {}) };
    return () => formatted;
  };
  mockFormat.combine = jest.fn(() => ({ transform: () => {} }));
  mockFormat.timestamp = jest.fn(() => ({ transform: () => {} }));
  mockFormat.errors = jest.fn(() => ({ transform: () => {} }));
  mockFormat.json = jest.fn(() => ({ transform: () => {} }));
  mockFormat.printf = jest.fn(() => ({ transform: () => {} }));
  mockFormat.colorize = jest.fn(() => ({ transform: () => {} }));
  
  return {
    createLogger: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      add: jest.fn(),
    })),
    format: mockFormat,
    transports: {
      Console: jest.fn(),
      File: jest.fn(),
    },
  };
});

// Global test timeout
jest.setTimeout(10000);

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});