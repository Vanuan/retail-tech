import { IPlanogramRepository, PlanogramConfig } from "../types";
import { MOCK_PLANOGRAM } from "./mock-data";
import { planogramStorage } from "./storage";

/**
 * LocalStorage-backed Planogram Repository
 */
export class PlanogramRepository implements IPlanogramRepository {
  async getById(id: string): Promise<PlanogramConfig | null> {
    const saved = planogramStorage.load(id);
    if (saved) return saved;

    // Fallback to mock if it's the default ID
    if (id === "default" || id === "mock") {
      return MOCK_PLANOGRAM;
    }

    return null;
  }

  async listAllIds(): Promise<string[]> {
    const ids = planogramStorage.listIds();
    return ids.length > 0 ? ids : ["default"];
  }

  async listAll(): Promise<PlanogramConfig[]> {
    const all = planogramStorage.listAll();
    return all.length > 0 ? all : [MOCK_PLANOGRAM];
  }

  async save(id: string, config: PlanogramConfig): Promise<void> {
    planogramStorage.save(id, config);
  }

  async delete(id: string): Promise<boolean> {
    planogramStorage.clear(id);
    return true;
  }
}
