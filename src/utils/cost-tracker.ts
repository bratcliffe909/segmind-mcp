import * as fs from 'fs';
import * as path from 'path';

import { logger } from './logger.js';

interface ModelCostData {
  modelId: string;
  averageCost: number;
  minCost: number;
  maxCost: number;
  sampleCount: number;
  lastUpdated: string;
  parameters?: {
    resolution?: string;
    quality?: string;
    samples?: number;
  };
}

interface CostDatabase {
  version: string;
  models: Record<string, ModelCostData>;
  lastUpdated: string;
}

class CostTracker {
  private static instance: CostTracker;
  private costData: CostDatabase;
  private dataPath: string;
  private isDirty: boolean = false;

  private constructor() {
    this.dataPath = path.join(process.cwd(), '.segmind-cost-data.json');
    this.costData = this.loadCostData();
    
    // Save periodically if dirty
    setInterval(() => {
      if (this.isDirty) {
        this.saveCostData();
      }
    }, 30000); // Every 30 seconds
  }

  static getInstance(): CostTracker {
    if (!CostTracker.instance) {
      CostTracker.instance = new CostTracker();
    }
    return CostTracker.instance;
  }

  private loadCostData(): CostDatabase {
    try {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      if (fs.existsSync(this.dataPath)) {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const data = fs.readFileSync(this.dataPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      logger.warn('Failed to load cost data', { error });
    }

    // Return empty database
    return {
      version: '1.0',
      models: {},
      lastUpdated: new Date().toISOString(),
    };
  }

  private saveCostData(): void {
    try {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.writeFileSync(this.dataPath, JSON.stringify(this.costData, null, 2));
      this.isDirty = false;
      logger.debug('Cost data saved');
    } catch (error) {
      logger.error('Failed to save cost data', { error });
    }
  }

  /**
   * Record the actual cost from an API response
   */
  recordCost(modelId: string, creditsUsed: number, parameters?: Record<string, unknown>): void {
    const existing = this.costData.models[modelId];
    
    if (existing) {
      // Update existing data with running average
      const totalSamples = existing.sampleCount + 1;
      const newAverage = (existing.averageCost * existing.sampleCount + creditsUsed) / totalSamples;
      
      const updatedModel = {
        ...existing,
        averageCost: newAverage,
        minCost: Math.min(existing.minCost, creditsUsed),
        maxCost: Math.max(existing.maxCost, creditsUsed),
        sampleCount: totalSamples,
        lastUpdated: new Date().toISOString(),
        parameters: parameters || existing.parameters,
      };
      
      this.costData.models[modelId] = updatedModel;
    } else {
      // Create new entry
      const newModel = {
        modelId,
        averageCost: creditsUsed,
        minCost: creditsUsed,
        maxCost: creditsUsed,
        sampleCount: 1,
        lastUpdated: new Date().toISOString(),
        parameters,
      };
      
      this.costData.models[modelId] = newModel;
    }

    this.costData.lastUpdated = new Date().toISOString();
    this.isDirty = true;

    const currentModel = this.costData.models[modelId];
    logger.debug('Cost recorded', {
      modelId,
      creditsUsed,
      newAverage: currentModel?.averageCost,
    });
  }

  /**
   * Get estimated cost for a model
   */
  getEstimatedCost(modelId: string): number | null {
    const data = this.costData.models[modelId];
    if (data && data.sampleCount > 0) {
      return data.averageCost;
    }
    return null;
  }

  /**
   * Get detailed cost information
   */
  getCostInfo(modelId: string): ModelCostData | null {
    return this.costData.models[modelId] || null;
  }

  /**
   * Get all cost data
   */
  getAllCosts(): Record<string, ModelCostData> {
    return this.costData.models;
  }

  /**
   * Clear cost data for a specific model
   */
  clearModelData(modelId: string): void {
    const models = { ...this.costData.models };
    delete models[modelId];
    this.costData.models = models;
    this.isDirty = true;
  }

  /**
   * Export cost data for analysis
   */
  exportData(): CostDatabase {
    return JSON.parse(JSON.stringify(this.costData));
  }

  /**
   * Import cost data (useful for sharing pricing info)
   */
  importData(data: CostDatabase): void {
    // Merge with existing data
    const models = { ...this.costData.models };
    
    Object.entries(data.models).forEach(([modelId, modelData]) => {
      const existing = models[modelId];
      if (!existing || modelData.sampleCount > existing.sampleCount) {
        models[modelId] = modelData;
      }
    });
    
    this.costData.models = models;
    this.isDirty = true;
  }
}

export const costTracker = CostTracker.getInstance();
export type { ModelCostData, CostDatabase };