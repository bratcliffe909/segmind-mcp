// This file sets up environment variables before any modules are imported
process.env.NODE_ENV = 'test';
process.env.SEGMIND_API_KEY = 'sg_mocktestapi12345678';

// Clear any cached modules that might have loaded config already
const Module = require('module');
Object.keys(Module._cache).forEach(key => {
  if (key.includes('src/utils/config')) {
    delete Module._cache[key];
  }
});