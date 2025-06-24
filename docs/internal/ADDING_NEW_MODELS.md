# Guide: Adding New Segmind Models

This guide provides a step-by-step process for adding new Segmind models to the MCP server. Follow these steps carefully to ensure proper integration and testing.

## Prerequisites

- Access to Segmind API documentation
- Valid Segmind API key for testing
- Understanding of the model's purpose and parameters

## Step-by-Step Process

### Step 1: Research the Model

1. **Visit Segmind API Documentation**
   - Go to https://docs.segmind.com
   - Find the model you want to add
   - Note the API endpoint URL

2. **Gather Model Information**
   ```
   Required information:
   - Model name and description
   - API endpoint (e.g., /v1/model-name)
   - Category (text2img, img2img, video, enhancement, specialized)
   - Input parameters and their constraints
   - Output format
   - Credit cost
   - Estimated processing time
   ```

3. **Test the API Endpoint**
   ```bash
   # Use curl or Postman to test the endpoint
   curl -X POST https://api.segmind.com/v1/model-name \
     -H "x-api-key: your_api_key" \
     -H "Content-Type: application/json" \
     -d '{"param1": "value1", "param2": "value2"}'
   ```

### Step 2: Update Model Registry

1. **Edit `src/models/working-models.ts`**

   Add the model configuration:
   ```typescript
   {
     id: 'model-id',
     name: 'Model Display Name',
     description: 'Clear description of what the model does',
     category: ModelCategory.TEXT_TO_IMAGE, // or appropriate category
     endpoint: '/model-endpoint',
     apiVersion: 'v1',
     outputType: OutputType.IMAGE, // or VIDEO/SPECIALIZED
     estimatedTime: 10, // seconds
     creditsPerUse: 0.3, // credits per generation
     parameters: z.object({
       // Define Zod schema for parameters
       prompt: z.string(),
       negative_prompt: z.string().optional(),
       width: z.number().min(256).max(2048).multipleOf(8).default(1024),
       height: z.number().min(256).max(2048).multipleOf(8).default(1024),
       // Add all other parameters...
     }),
     supportedFormats: ['png', 'jpeg', 'webp'],
     maxDimensions: { width: 2048, height: 2048 } // if applicable
   }
   ```

2. **Parameter Schema Guidelines**
   - Use appropriate Zod validators
   - Set sensible defaults
   - Add min/max constraints
   - Include descriptions for complex parameters
   - Make optional parameters truly optional

### Step 3: Update Tool Implementation

If the model fits an existing category, no tool changes needed. For new categories:

1. **Create New Tool** (if needed)
   ```typescript
   // src/tools/new-category.ts
   export class NewCategoryTool extends BaseTool {
     // Implementation
   }
   ```

2. **Update Existing Tool** (if applicable)
   - Ensure the tool can handle the new model
   - Add any special parameter mapping
   - Handle unique response formats

### Step 4: Create Mock Tests

1. **Add to `test/integration/models.test.ts`**
   ```typescript
   describe(`${model.name} (${model.id})`, () => {
     it('should have valid configuration', () => {
       // Test configuration validity
     });

     it('should generate with default parameters', async () => {
       // Test basic functionality
     });

     it('should handle custom parameters', async () => {
       // Test parameter variations
     });
   });
   ```

### Step 5: Create Internal API Tests

1. **Create test file `test-internal/test-[model-id].ts`**
   ```typescript
   #!/usr/bin/env tsx
   import { config } from 'dotenv';
   import { apiClient } from '../src/api/client.js';
   
   config({ path: '.env' });

   async function testModel() {
     console.log('Testing [Model Name]...');
     
     const params = {
       // Add test parameters
     };
     
     try {
       const response = await apiClient.request('/endpoint', params);
       console.log('Success:', response);
       // Save output if applicable
     } catch (error) {
       console.error('Failed:', error);
     }
   }

   testModel().catch(console.error);
   ```

2. **Run the test**
   ```bash
   npx tsx test-internal/test-[model-id].ts
   ```

### Step 6: Update Documentation

1. **Update `README.md`**
   - Add model to supported models list
   - Include usage examples
   - Update model count

2. **Update `docs/MODELS.md`**
   - Add detailed model information
   - Include parameter reference
   - Add example prompts/use cases

3. **Update `docs/USER_GUIDE.md`**
   - Add practical examples
   - Include tips for best results
   - Document any limitations

### Step 7: Test Everything

1. **Run Linting and Type Checks**
   ```bash
   npm run lint
   npm run typecheck
   ```

2. **Run Mock Tests**
   ```bash
   npm test
   ```

3. **Run Internal API Test**
   ```bash
   npx tsx test-internal/test-[model-id].ts
   ```

4. **Manual Testing**
   - Start the MCP server
   - Test with Claude Desktop
   - Try various parameter combinations
   - Verify error handling

### Step 8: Final Checklist

- [ ] Model configuration added to `working-models.ts`
- [ ] Zod schema properly defined with constraints
- [ ] Mock tests added and passing
- [ ] Internal API test created and working
- [ ] Documentation updated in all relevant files
- [ ] No API keys or sensitive data in code
- [ ] Linting and type checking pass
- [ ] Credits and timing estimates are accurate
- [ ] Examples and use cases documented

## Common Issues and Solutions

### Issue: Parameter Validation Fails
**Solution**: Check Zod schema matches API documentation exactly

### Issue: API Returns Unexpected Format
**Solution**: Update response handling in API client or tool

### Issue: Model Not Found
**Solution**: Verify endpoint URL and API version

### Issue: Credits Not Calculated
**Solution**: Check creditsPerUse in model config

## Example: Adding a New Text-to-Image Model

Let's say we're adding "DALL-E 3":

1. **Research**
   ```
   Endpoint: /v1/dalle3
   Category: TEXT_TO_IMAGE
   Parameters: prompt, size, quality, style
   Credits: 0.5 per image
   Time: 15 seconds
   ```

2. **Add to working-models.ts**
   ```typescript
   {
     id: 'dalle3',
     name: 'DALL-E 3',
     description: 'Advanced text-to-image generation',
     category: ModelCategory.TEXT_TO_IMAGE,
     endpoint: '/dalle3',
     apiVersion: 'v1',
     outputType: OutputType.IMAGE,
     estimatedTime: 15,
     creditsPerUse: 0.5,
     parameters: z.object({
       prompt: z.string().max(4000),
       size: z.enum(['1024x1024', '1792x1024', '1024x1792']).default('1024x1024'),
       quality: z.enum(['standard', 'hd']).default('standard'),
       style: z.enum(['vivid', 'natural']).optional(),
     }),
     supportedFormats: ['png'],
   }
   ```

3. **Test and document**
   - Create tests
   - Update docs
   - Verify functionality

## Maintenance

- Regularly check Segmind docs for API changes
- Update parameter constraints if needed
- Monitor credit usage and adjust estimates
- Keep examples current and relevant