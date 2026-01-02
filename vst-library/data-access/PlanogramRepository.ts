import { PlanogramConfig, IPlanogramRepository } from "../types";
import { STUB_PLANOGRAMS } from "./stubs/planograms";

/**
 * PLANOGRAM REPOSITORY
 *
 * Manages the retrieval and persistence of Planogram Configurations (L1-L3 data).
 * This repository serves as the primary entry point for loading the structure
 * of a retail display, including its fixture type and the list of products
 * placed within it.
 */
export class PlanogramRepository implements IPlanogramRepository {
  // In-memory store for planogram configurations
  private planogramStore: Map<string, PlanogramConfig> = new Map();

  constructor() {
    this.initializeDefaults();
  }

  /**
   * Populates the repository with default mock planograms for development.
   */
  private initializeDefaults(): void {
    Object.entries(STUB_PLANOGRAMS).forEach(([id, config]) => {
      this.planogramStore.set(id, config);
    });
  }

  /**
   * Retrieves a planogram configuration by its unique identifier.
   * @param id The unique ID of the planogram.
   */
  public async getById(id: string): Promise<PlanogramConfig | null> {
    const planogram = this.planogramStore.get(id);
    if (!planogram) {
      console.warn(`PlanogramRepository: Planogram with ID "${id}" not found.`);
      return null;
    }
    // Return a deep copy to prevent accidental mutation of the store
    return JSON.parse(JSON.stringify(planogram));
  }

  /**
   * Retrieves all available planogram IDs.
   */
  public async listAllIds(): Promise<string[]> {
    return Array.from(this.planogramStore.keys());
  }

  /**
   * Persists or updates a planogram configuration.
   * @param id Unique identifier for the planogram.
   * @param config The planogram configuration data.
   */
  public async save(id: string, config: PlanogramConfig): Promise<void> {
    this.planogramStore.set(id, config);
  }

  /**
   * Deletes a planogram from the repository.
   * @param id The ID of the planogram to remove.
   */
  public async delete(id: string): Promise<boolean> {
    return this.planogramStore.delete(id);
  }

  /**
   * Seeds the repository with a custom set of planograms.
   * Useful for testing scenarios or importing data from external sources.
   */
  public seed(planograms: Record<string, PlanogramConfig>): void {
    Object.entries(planograms).forEach(([id, config]) => {
      this.planogramStore.set(id, config);
    });
  }
}
