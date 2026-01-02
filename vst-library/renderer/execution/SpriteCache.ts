/**
 * SPRITE CACHE
 * Manages the memory and lifecycle of loaded image assets.
 * Prevents redundant network requests and reduces heap pressure by reusing
 * HTMLImageElement instances across multiple product instances.
 */
export interface CachedSprite {
  image: HTMLImageElement;
  width: number;
  height: number;
  angle: number;
  timestamp: number;
}

export class SpriteCache {
  private cache: Map<string, CachedSprite> = new Map();
  private readonly maxCacheSize: number = 500;
  private readonly expirationMs: number = 1000 * 60 * 60; // 1 hour

  /**
   * Retrieves a sprite from the cache.
   * @param key Unique identifier for the sprite (e.g., "SKU_ANGLE")
   */
  public get(key: string): CachedSprite | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      // Update timestamp for LRU-like behavior if we implement pruning
      entry.timestamp = Date.now();
      return entry;
    }
    return undefined;
  }

  /**
   * Stores a sprite in the cache.
   * @param key Unique identifier for the sprite.
   * @param sprite The sprite data to cache.
   */
  public set(key: string, sprite: CachedSprite): void {
    if (this.cache.size >= this.maxCacheSize) {
      this.prune();
    }
    this.cache.set(key, sprite);
  }

  /**
   * Checks if a sprite exists in the cache.
   * @param key Unique identifier for the sprite.
   */
  public has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Removes a specific sprite from the cache.
   */
  public delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clears the entire cache.
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Prunes old or least recently used items from the cache to manage memory.
   */
  private prune(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    // 1. Remove expired items
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.expirationMs) {
        keysToDelete.push(key);
      }
    }

    // 2. If still over capacity, remove the oldest items
    if (this.cache.size - keysToDelete.length > this.maxCacheSize * 0.8) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      const numToRemove = Math.floor(this.cache.size * 0.2);
      for (let i = 0; i < numToRemove; i++) {
        keysToDelete.push(sortedEntries[i][0]);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Returns current cache statistics.
   */
  public getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize
    };
  }
}
