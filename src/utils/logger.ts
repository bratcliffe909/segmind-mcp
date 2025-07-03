import winston from 'winston';

import { config } from './config.js';

// Sensitive keys to redact from logs
const SENSITIVE_KEYS = [
  'apikey',
  'api_key',
  'apiKey',
  'password',
  'token',
  'secret',
  'authorization',
  'auth',
  'key',
  'credential',
  'private',
];

/**
 * Recursively sanitize an object by redacting sensitive values
 */
function sanitizeObject(obj: unknown, depth = 0): unknown {
  // Prevent deep recursion
  if (depth > 10) return '[MAX_DEPTH]';
  
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    // Check if the string looks like an API key
    if (obj.startsWith('sg_') && obj.length > 20) {
      return '[REDACTED_API_KEY]';
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }
  
  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Check if this key should be redacted
      if (SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 50) {
        // Truncate long strings that might contain sensitive data
        sanitized[key] = value.substring(0, 50) + '...[TRUNCATED]';
      } else {
        sanitized[key] = sanitizeObject(value, depth + 1);
      }
    }
    
    return sanitized;
  }
  
  return obj;
}

/**
 * Custom format for sanitizing log data
 */
const sanitizeFormat = winston.format((info) => {
  if (config.security.sanitizeLogs) {
    // Sanitize the main message
    if (typeof info.message === 'object') {
      info.message = sanitizeObject(info.message);
    }
    
    // Sanitize any additional data
    const { level, message, timestamp, ...rest } = info;
    const sanitizedRest = sanitizeObject(rest) as Record<string, unknown>;
    
    return {
      level,
      message,
      timestamp,
      ...sanitizedRest,
    };
  }
  
  return info;
});

/**
 * Create and configure the logger instance
 */
function createLogger(): winston.Logger {
  const formats = [
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS',
    }),
    winston.format.errors({ stack: true }),
    sanitizeFormat(),
  ];
  
  // Add formatting based on environment
  if (config.nodeEnv === 'development') {
    // Use simple format without colorization to avoid errors
    formats.push(
      winston.format.printf(({ timestamp, level, message, ...rest }) => {
        const extra = Object.keys(rest).length > 0 ? `\n${JSON.stringify(rest, null, 2)}` : '';
        return `${timestamp} [${level}]: ${message}${extra}`;
      }),
    );
  } else {
    formats.push(winston.format.json());
  }
  
  const logger = winston.createLogger({
    level: config.logLevel,
    format: winston.format.combine(...formats),
    defaultMeta: { service: 'segmind-mcp' },
    transports: [
      new winston.transports.Console({
        silent: config.nodeEnv === 'test' || process.env.MCP_MODE === 'true',
      }),
    ],
  });
  
  // Add file transport in production
  if (config.nodeEnv === 'production') {
    logger.add(
      new winston.transports.File({
        filename: 'error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    );
    
    logger.add(
      new winston.transports.File({
        filename: 'combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    );
  }
  
  return logger;
}

// Create and export the logger instance lazily
let _logger: winston.Logger | null = null;

export const logger = new Proxy({} as winston.Logger, {
  get(_target, prop) {
    if (!_logger) {
      _logger = createLogger();
    }
    return (_logger as any)[prop];
  }
});

/**
 * Log with context
 */
export function logWithContext(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  context?: Record<string, unknown>,
): void {
  logger[level](message, context || {});
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: Record<string, unknown>): winston.Logger {
  return logger.child(context);
}