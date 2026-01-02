import { IFixtureRepository, FixtureConfig } from "../types";
import { DEFAULT_FIXTURE } from "./mock-data";

/**
 * In-memory Fixture Repository
 */
export class FixtureRepository implements IFixtureRepository {
  private fixtures: Map<string, FixtureConfig> = new Map();

  async initialize() {
    this.fixtures.set("standard-shelf", DEFAULT_FIXTURE);
  }

  async getByType(type: string): Promise<FixtureConfig | null> {
    return this.fixtures.get(type) || null;
  }

  async registerFixture(config: FixtureConfig): Promise<void> {
    this.fixtures.set(config.type, config);
  }

  async listAvailableTypes(): Promise<string[]> {
    return Array.from(this.fixtures.keys());
  }
}
