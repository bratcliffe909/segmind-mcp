#!/usr/bin/env node

/**
 * Quick diagnostic to check the npm package state
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('=== NPM Package Diagnostic ===\n');

// Check if package is published
try {
  console.log('1. Checking npm registry for @bratcliffe909/mcp-server-segmind...');
  const npmInfo = execSync('npm view @bratcliffe909/mcp-server-segmind --json', { encoding: 'utf8' });
  const packageInfo = JSON.parse(npmInfo);
  
  console.log(`   ✓ Package found on npm`);
  console.log(`   - Version: ${packageInfo.version}`);
  console.log(`   - Binary: ${packageInfo.bin ? Object.keys(packageInfo.bin).join(', ') : 'none'}`);
  console.log(`   - Main: ${packageInfo.main}`);
} catch (err) {
  console.log('   ✗ Package not found on npm registry');
}

// Check local package.json
console.log('\n2. Checking local package.json...');
try {
  const packageJson = require('./package.json');
  console.log(`   - Name: ${packageJson.name}`);
  console.log(`   - Version: ${packageJson.version}`);
  console.log(`   - Binary: ${packageJson.bin ? Object.keys(packageJson.bin).join(', ') : 'none'}`);
  console.log(`   - Main: ${packageJson.main}`);
} catch (err) {
  console.log('   ✗ Could not read package.json');
}

// Test npx command
console.log('\n3. Testing npx command (this will download if needed)...');
console.log('   Command: npx -y @bratcliffe909/mcp-server-segmind@latest --version\n');

try {
  // First, try with --version flag
  const versionOutput = execSync('npx -y @bratcliffe909/mcp-server-segmind@latest --version 2>&1', { 
    encoding: 'utf8',
    timeout: 30000 
  });
  console.log('   Output:', versionOutput.trim());
} catch (err) {
  console.log('   ✗ Failed with --version flag');
  console.log('   Error:', err.message);
  
  // Try without any flags
  console.log('\n   Trying without flags (will exit quickly)...');
  try {
    const output = execSync('timeout 2 npx -y @bratcliffe909/mcp-server-segmind@latest 2>&1', { 
      encoding: 'utf8',
      shell: true
    });
    console.log('   Output:', output.trim() || '(no output)');
  } catch (err2) {
    console.log('   Process exited (expected for MCP server)');
  }
}

console.log('\n=== End Diagnostic ===');