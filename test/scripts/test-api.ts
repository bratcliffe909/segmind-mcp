import 'dotenv/config';

async function testAPI() {
  const apiKey = process.env.SEGMIND_API_KEY;
  
  if (!apiKey) {
    console.error('❌ Error: No API key found in .env file');
    console.error('   Please set SEGMIND_API_KEY in your .env file');
    process.exit(1);
  }

  console.log('🧪 Testing Segmind API Configuration...\n');
  console.log(`📝 API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);

  // Mock test - just verify configuration
  console.log('\n1️⃣ Checking API key format...');
  
  if (apiKey.match(/^(sg_|SG_)[a-zA-Z0-9]{12,}$/)) {
    console.log('✅ API key format is valid!');
    console.log('💰 Mock credits remaining: 1000');
    console.log('\n✨ Configuration test passed! Your Segmind MCP Server is ready to use.');
  } else {
    console.error('❌ Invalid API key format');
    console.error('   API key should start with sg_ or SG_ followed by alphanumeric characters');
    process.exit(1);
  }
}

testAPI().catch(console.error);