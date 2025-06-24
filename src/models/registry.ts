import { z } from 'zod';

import { logger } from '../utils/logger.js';

import { ModelCategory, ModelConfig, OutputType } from './types.js';
import { WORKING_MODELS } from './working-models.js';

// Re-export types for backward compatibility
export { ModelCategory, OutputType, ModelConfig };

export class ModelRegistry {
  private models: Map<string, ModelConfig> = new Map();
  private modelsByCategory: Map<ModelCategory, string[]> = new Map();

  constructor() {
    this.initializeModels();
  }

  private initializeModels(): void {
    // Initialize category maps
    Object.values(ModelCategory).forEach(category => {
      this.modelsByCategory.set(category, []);
    });

    // Register all working models
    WORKING_MODELS.forEach(model => {
      this.registerModel(model);
    });

    logger.info('Model registry initialized', {
      totalModels: this.models.size,
      categories: Object.values(ModelCategory).map(cat => ({
        category: cat,
        count: this.modelsByCategory.get(cat)?.length || 0,
      })),
    });
  }

  private registerModel(config: ModelConfig): void {
    this.models.set(config.id, config);
    
    const categoryModels = this.modelsByCategory.get(config.category) || [];
    categoryModels.push(config.id);
    this.modelsByCategory.set(config.category, categoryModels);
  }

  public getModel(modelId: string): ModelConfig | undefined {
    return this.models.get(modelId);
  }

  public getModelsByCategory(category: ModelCategory): ModelConfig[] {
    const modelIds = this.modelsByCategory.get(category) || [];
    return modelIds.map(id => this.models.get(id)!).filter(Boolean);
  }

  public getAllModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  public findModelByEndpoint(endpoint: string): ModelConfig | undefined {
    return Array.from(this.models.values()).find(model => model.endpoint === endpoint);
  }

  public searchModels(query: string): ModelConfig[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.models.values()).filter(model => 
      model.name.toLowerCase().includes(lowerQuery) ||
      model.description.toLowerCase().includes(lowerQuery) ||
      model.id.toLowerCase().includes(lowerQuery)
    );
  }

  public getModelCategories(): ModelCategory[] {
    return Object.values(ModelCategory);
  }

  public validateModelParameters(modelId: string, params: any): { 
    success: boolean; 
    data?: any; 
    error?: string 
  } {
    const model = this.getModel(modelId);
    if (!model) {
      return { success: false, error: 'Model not found' };
    }

    try {
      const validated = model.parameters.parse(params);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          success: false, 
          error: error.errors.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')
        };
      }
      return { success: false, error: 'Invalid parameters' };
    }
  }
}

// Singleton instance
export const modelRegistry = new ModelRegistry();