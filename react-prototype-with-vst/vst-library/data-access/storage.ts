import { PlanogramConfig, PlanogramConfigSchema } from "@vst/vocabulary-types";

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

      // 2. Migration and Healing fallback
      // If validation failed but it looks like a planogram, try to heal it
      if (parsed && typeof parsed === "object" && (parsed as any).fixture) {
        console.warn(
          `Validation failed for planogram '${id}', attempting to heal...`,
          result.error,
        );

        // Deep clone the object to avoid mutating the original parsed result
        // while we apply healing logic.
        const config = JSON.parse(JSON.stringify(parsed)) as any;
        let modified = false;

        // Ensure basic metadata
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

        // Heal fixture
        if (!config.fixture || typeof config.fixture !== "object") {
          config.fixture = {
            type: "standard-gondola",
            placementModel: "shelf-surface",
            dimensions: { width: 1000, height: 2000, depth: 500 },
            config: {
              shelves: [{ id: "shelf-0", index: 0, baseHeight: 300 }],
            },
          };
          modified = true;
        } else {
          if (!config.fixture.dimensions) {
            config.fixture.dimensions = {
              width: 1000,
              height: 2000,
              depth: 500,
            };
            modified = true;
          }
          if (
            !config.fixture.config ||
            !Array.isArray(config.fixture.config.shelves)
          ) {
            config.fixture.config = {
              shelves: [{ id: "shelf-0", index: 0, baseHeight: 300 }],
            };
            modified = true;
          }
        }

        // Heal products list
        if (Array.isArray(config.products)) {
          const originalCount = config.products.length;
          // Filter out products that are fundamentally broken or fix fixable issues.
          config.products = config.products.filter((p: any) => {
            if (!p || typeof p !== "object") return false;

            // Ensure SKU exists
            if (!p.sku) return false;

            // Ensure ID exists
            if (!p.id) {
              p.id = Math.random().toString(36).slice(2);
              modified = true;
            }

            // Ensure placement and position objects exist
            if (!p.placement || typeof p.placement !== "object") {
              p.placement = {
                facings: { horizontal: 1, vertical: 1, total: 1 },
                position: { model: "shelf-surface", x: 0, shelfIndex: 0 },
              };
              modified = true;
            } else if (
              !p.placement.position ||
              typeof p.placement.position !== "object"
            ) {
              p.placement.position = {
                model: "shelf-surface",
                x: 0,
                shelfIndex: 0,
              };
              modified = true;
            }

            const pos = p.placement.position;

            // Heal missing model
            if (pos.model !== "shelf-surface") {
              pos.model = "shelf-surface";
              modified = true;
            }

            // Heal missing x coordinate which was seen in logs
            if (typeof pos.x !== "number" || isNaN(pos.x)) {
              console.warn(
                `Product ${p.id || p.sku} in planogram ${id} has invalid X position. Defaulting to 0.`,
              );
              pos.x = 0;
              modified = true;
            }

            // Heal missing shelfIndex
            if (typeof pos.shelfIndex !== "number" || isNaN(pos.shelfIndex)) {
              pos.shelfIndex = 0;
              modified = true;
            }

            // Heal missing facings
            if (
              !p.placement.facings ||
              typeof p.placement.facings !== "object"
            ) {
              p.placement.facings = { horizontal: 1, vertical: 1, total: 1 };
              modified = true;
            } else {
              const f = p.placement.facings;
              if (typeof f.horizontal !== "number") {
                f.horizontal = 1;
                modified = true;
              }
              if (typeof f.vertical !== "number") {
                f.vertical = 1;
                modified = true;
              }
            }

            return true;
          });

          if (config.products.length !== originalCount) {
            modified = true;
          }
        } else {
          config.products = [];
          modified = true;
        }

        // Final validation attempt after healing
        const healed = PlanogramConfigSchema.safeParse(config);
        if (healed.success) {
          if (modified) {
            console.log(`Healed planogram '${id}' and saving to storage.`);
            planogramStorage.save(
              id,
              healed.data as unknown as PlanogramConfig,
            );
          }
          return healed.data as unknown as PlanogramConfig;
        } else {
          console.error(
            `Failed to heal planogram '${id}':`,
            healed.error.flatten(),
          );
        }
      }

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
