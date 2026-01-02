import { PlanogramConfig } from "../types";
import { PlanogramConfigSchema } from "../types/planogram/schemas";

const KEY_PREFIX = "vst-planogram-";

/**
 * Utility for persisting and retrieving planogram configurations.
 * Currently uses localStorage as a rudimentary persistence layer.
 */
export const planogramStorage = {
  /**
   * Generates the storage key for a given planogram ID.
   */
  getKey: (id: string): string => {
    return `${KEY_PREFIX}${id}`;
  },

  /**
   * Saves the planogram configuration to local storage.
   */
  save: (id: string, data: PlanogramConfig): void => {
    if (typeof window === "undefined") return;

    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(planogramStorage.getKey(id), serialized);
    } catch (error) {
      console.error(`Failed to save planogram '${id}' to storage:`, error);
      throw new Error("Storage operation failed");
    }
  },

  /**
   * Loads the planogram configuration from local storage.
   * Returns null if no data is found or if parsing fails.
   */
  load: (id: string): PlanogramConfig | null => {
    if (typeof window === "undefined") return null;

    try {
      const saved = localStorage.getItem(planogramStorage.getKey(id));
      if (!saved) return null;

      const parsed = JSON.parse(saved);

      // 1. Try strict validation first
      const result = PlanogramConfigSchema.safeParse(parsed);
      if (result.success) {
        return result.data as unknown as PlanogramConfig;
      }

      // 2. Migration fallback for legacy data
      // If validation failed but it looks like a planogram (has fixture/products), migrate it
      if (parsed && parsed.fixture && Array.isArray(parsed.products)) {
        const config = parsed as any;
        let modified = false;

        if (!config.id) {
          config.id = id;
          modified = true;
        }
        if (!config.name) {
          config.name =
            id === "default"
              ? "Draft Planogram"
              : `Planogram ${id.slice(0, 8)}`;
          modified = true;
        }
        if (!config.createdAt) {
          config.createdAt = Date.now();
          modified = true;
        }
        if (!config.updatedAt) {
          config.updatedAt = Date.now();
          modified = true;
        }

        // Validate migrated data to be sure
        const migrated = PlanogramConfigSchema.safeParse(config);
        if (migrated.success) {
          if (modified) {
            console.log(`Migrating legacy planogram '${id}' to new format`);
            planogramStorage.save(
              id,
              migrated.data as unknown as PlanogramConfig,
            );
          }
          return migrated.data as unknown as PlanogramConfig;
        }
      }

      console.warn(`Validation failed for planogram '${id}'`, result.error);
      return null;
    } catch (error) {
      console.error(`Failed to load planogram '${id}' from storage:`, error);
      return null;
    }
  },

  /**
   * Removes the saved planogram data.
   */
  clear: (id: string): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(planogramStorage.getKey(id));
  },

  /**
   * Checks if there is a saved planogram.
   */
  hasSavedData: (id: string): boolean => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(planogramStorage.getKey(id));
  },

  /**
   * Lists all saved planogram IDs.
   */
  listIds: (): string[] => {
    if (typeof window === "undefined") return [];

    const ids: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(KEY_PREFIX)) {
        ids.push(key.slice(KEY_PREFIX.length));
      }
    }
    return ids;
  },

  /**
   * Lists all saved planogram configurations.
   */
  listAll: (): PlanogramConfig[] => {
    if (typeof window === "undefined") return [];

    const planograms: PlanogramConfig[] = [];
    const ids = planogramStorage.listIds();

    for (const id of ids) {
      const config = planogramStorage.load(id);
      if (config) {
        planograms.push(config);
      }
    }
    return planograms;
  },
};
