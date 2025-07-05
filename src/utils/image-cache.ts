/**
 * Simple in-memory image cache to avoid passing large base64 strings
 * Images are stored with temporary IDs that can be used in subsequent calls
 */

interface CachedImage {
  base64: string;
  mimeType: string;
  path: string;
  size: number;
  timestamp: number;
}

class ImageCache {
  private cache: Map<string, CachedImage> = new Map();
  private readonly maxAge = 15 * 60 * 1000; // 15 minutes
  private readonly maxSize = 10; // Maximum number of cached images
  
  /**
   * Generate a unique ID for an image
   */
  private generateId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
  
  /**
   * Store an image and return its ID
   */
  store(base64: string, mimeType: string, path: string): string {
    // Clean up old entries
    this.cleanup();
    
    // If cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      if (entries.length > 0 && entries[0]) {
        this.cache.delete(entries[0][0]);
      }
    }
    
    const id = this.generateId();
    this.cache.set(id, {
      base64,
      mimeType,
      path,
      size: base64.length,
      timestamp: Date.now(),
    });
    
    return id;
  }
  
  /**
   * Retrieve an image by ID
   */
  get(id: string): CachedImage | undefined {
    const image = this.cache.get(id);
    if (image && Date.now() - image.timestamp > this.maxAge) {
      this.cache.delete(id);
      return undefined;
    }
    return image;
  }
  
  /**
   * Check if an ID exists
   */
  has(id: string): boolean {
    return this.get(id) !== undefined;
  }
  
  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [id, image] of this.cache.entries()) {
      if (now - image.timestamp > this.maxAge) {
        this.cache.delete(id);
      }
    }
  }
  
  /**
   * Clear all cached images
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getStats(): { count: number; totalSize: number } {
    this.cleanup();
    let totalSize = 0;
    for (const image of this.cache.values()) {
      totalSize += image.size;
    }
    return {
      count: this.cache.size,
      totalSize,
    };
  }
}

export const imageCache = new ImageCache();