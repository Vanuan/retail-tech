import { IPlanogramRepository, PlanogramConfig } from "@vst/vocabulary-types";
import { MOCK_PLANOGRAM } from "./mock-data";
import { planogramStorage } from "./storage";

/**
 * LocalStorage-backed Planogram Repository
 */
export class PlanogramRepository implements IPlanogramRepository {
  /**
   * Retrieves a planogram configuration by its unique identifier.
   */
  async getById(id: string): Promise<PlanogramConfig | null> {
    const saved = planogramStorage.load(id);
    if (saved) return saved;

    // Fallback to mock if it's the default ID
    if (id === "default" || id === "mock") {
      return MOCK_PLANOGRAM;
    }

    return null;
  }

  /**
   * Returns a list of all saved planogram IDs.
   */
  async listAllIds(): Promise<string[]> {
    const ids = planogramStorage.listIds();
    return ids.length > 0 ? ids : ["default"];
  }

  /**
   * Returns all saved planogram configurations.
   */
  async listAll(): Promise<PlanogramConfig[]> {
    const all = planogramStorage.listAll();
    return all.length > 0 ? all : [MOCK_PLANOGRAM];
  }

  /**
   * Persists a planogram configuration.
   */
  async save(id: string, config: PlanogramConfig): Promise<void> {
    planogramStorage.save(id, config);
  }

  /**
   * Removes a planogram configuration from storage.
   */
  async delete(id: string): Promise<boolean> {
    planogramStorage.clear(id);
    return true;
  }
}
