import { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { apiClient } from '../api/client.js';
import { modelRegistry } from '../models/registry.js';
import { costTracker } from '../utils/cost-tracker.js';
import { logger } from '../utils/logger.js';

import { BaseTool } from './base.js';

const EstimateCostSchema = z.object({
  operation: z.string().optional().describe('Type of operation (generate, transform, enhance, etc.)'),
  model: z.string().optional().describe('Model ID to estimate cost for'),
  category: z.string().optional().describe('Model category to list costs for'),
  num_images: z.number().int().min(1).max(10).optional().describe('Number of images to generate'),
  num_outputs: z.number().int().min(1).max(10).optional().describe('Number of outputs to generate'),
  list_all: z.boolean().optional().describe('List costs for all available models'),
});

export class EstimateCostTool extends BaseTool {
  protected readonly name = 'estimate_cost';
  protected readonly description = 'Estimate the credit cost and time for image/video generation operations';

  async execute(params: any): Promise<CallToolResult> {
    try {
      const validated = EstimateCostSchema.parse(params);
      
      // Get current credit balance
      let currentCredits: { remaining: number; used: number } | null = null;
      try {
        currentCredits = await apiClient.getCredits();
      } catch (error) {
        logger.warn('Failed to fetch current credits', { error });
      }

      const content: TextContent[] = [];

      if (validated.list_all || (!validated.model && !validated.category)) {
        // List all models with costs
        content.push({
          type: 'text',
          text: '## Model Cost Overview\n',
        });

        const categories = modelRegistry.getAllCategories();
        for (const category of categories) {
          const models = modelRegistry.getModelsByCategory(category);
          if (models.length === 0) continue;

          content.push({
            type: 'text',
            text: `\n### ${category}\n`,
          });

          const tableRows = models.map(model => {
            // Get actual cost from tracker or use hardcoded estimate
            const trackedCost = costTracker.getEstimatedCost(model.id);
            const costInfo = costTracker.getCostInfo(model.id);
            const displayCost = trackedCost ? trackedCost.toFixed(3) : model.creditsPerUse.toString();
            const costSource = trackedCost ? ` (avg of ${costInfo?.sampleCount} runs)` : ' (estimate)';
            
            return `| ${model.name} | ${model.id} | ${displayCost}${costSource} | ${model.estimatedTime}s |`;
          });

          content.push({
            type: 'text',
            text: `| Model | ID | Credits/Use | Est. Time |
|-------|-----|-------------|-----------|
${tableRows.join('\n')}\n`,
          });
        }

        if (currentCredits) {
          content.push({
            type: 'text',
            text: `\n**Your current balance**: ${currentCredits.remaining} credits`,
          });
        }

      } else if (validated.model) {
        // Estimate for specific model
        const model = modelRegistry.getModel(validated.model);
        if (!model) {
          return {
            content: [{
              type: 'text',
              text: `Model '${validated.model}' not found. Use list_models to see available models.`,
            }],
            isError: true,
          };
        }

        const numOperations = validated.num_images || validated.num_outputs || 1;
        
        // Get actual cost from tracker or use hardcoded estimate
        const trackedCost = costTracker.getEstimatedCost(model.id);
        const costInfo = costTracker.getCostInfo(model.id);
        const creditPerUse = trackedCost || model.creditsPerUse;
        const totalCredits = creditPerUse * numOperations;
        const totalTime = model.estimatedTime * numOperations;
        
        const costSource = trackedCost 
          ? `Based on ${costInfo?.sampleCount} actual generations (min: ${costInfo?.minCost}, max: ${costInfo?.maxCost}, avg: ${trackedCost.toFixed(3)})`
          : 'Based on estimated pricing';

        content.push({
          type: 'text',
          text: `## Cost Estimation for ${model.name}

**Model ID**: ${model.id}
**Category**: ${model.category}
**Operation**: ${validated.operation || 'generate'}

### Cost Breakdown
- Credits per use: ${creditPerUse.toFixed(3)}
- Number of operations: ${numOperations}
- **Total credits needed**: ${totalCredits.toFixed(3)}
- *${costSource}*

### Time Estimate
- Time per operation: ${model.estimatedTime}s
- **Total estimated time**: ${totalTime}s (~${Math.ceil(totalTime / 60)} minutes)

### Model Details
- ${model.description}
- Output type: ${model.outputType}`,
        });

        if (currentCredits) {
          const remainingAfter = currentCredits.remaining - totalCredits;
          const canAfford = remainingAfter >= 0;

          content.push({
            type: 'text',
            text: `
### Credit Balance
- Current balance: ${currentCredits.remaining} credits
- After operation: ${remainingAfter} credits
- ${canAfford ? '✅ You have sufficient credits' : '⚠️ INSUFFICIENT CREDITS'}

${!canAfford ? `You need ${Math.abs(remainingAfter)} more credits to complete this operation.` : ''}`,
          });
        }

      } else if (validated.category) {
        // Estimate for category
        const models = modelRegistry.getModelsByCategory(validated.category as any);
        if (models.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No models found in category '${validated.category}'.`,
            }],
            isError: true,
          };
        }

        const numOperations = validated.num_images || validated.num_outputs || 1;

        content.push({
          type: 'text',
          text: `## Cost Estimation for ${validated.category} Models

**Number of operations**: ${numOperations}

| Model | Credits/Op | Total Credits | Est. Time |
|-------|-----------|---------------|-----------|`,
        });

        for (const model of models) {
          // Get actual cost from tracker or use hardcoded estimate
          const trackedCost = costTracker.getEstimatedCost(model.id);
          const creditPerUse = trackedCost || model.creditsPerUse;
          const totalCredits = creditPerUse * numOperations;
          const totalTime = model.estimatedTime * numOperations;
          const source = trackedCost ? '*' : '';
          
          content.push({
            type: 'text',
            text: `| ${model.name} | ${creditPerUse.toFixed(3)}${source} | ${totalCredits.toFixed(3)} | ${totalTime}s |`,
          });
        }

        if (currentCredits) {
          content.push({
            type: 'text',
            text: `\n**Your current balance**: ${currentCredits.remaining} credits`,
          });
        }
      }

      // Add note about actual costs if we have any tracked data
      const allCosts = costTracker.getAllCosts();
      if (Object.keys(allCosts).length > 0) {
        content.push({
          type: 'text',
          text: `\n## 📊 Cost Accuracy
- Costs marked with * are based on actual usage data
- Unmarked costs are estimates from model configuration
- Actual costs may vary based on parameters (resolution, quality, etc.)
- The system learns and improves estimates with each use`,
        });
      }

      // Add helpful tips
      content.push({
        type: 'text',
        text: `
## 💡 Tips
- Use draft quality or lower resolution to save credits
- Test with single images before batch generation
- Some models like SDXL Lightning use fewer credits
- Enhanced models (upscaling) typically use more credits
- Cost estimates improve as you use the models more`,
      });

      return { content };

    } catch (error) {
      logger.error('Cost estimation failed', { error });
      return this.createErrorResponse(error);
    }
  }
}

export const estimateCostTool = new EstimateCostTool();