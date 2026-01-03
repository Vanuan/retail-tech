import { IFixtureRepository, FixtureConfig } from "@vst/vocabulary-types";
import { DEFAULT_FIXTURE } from "./mock-data";

/**
 * In-memory Fixture Repository
 */
export class FixtureRepository implements IFixtureRepository {
  private fixtures: Map<string, FixtureConfig> = new Map();

  /**
   * Initializes the repository with default fixture data.
   */
  async initialize() {
    this.fixtures.set("standard-shelf", DEFAULT_FIXTURE);
  }

  /**
   * Retrieves a fixture configuration by its type identifier.
   */
  async getByType(type: string): Promise<FixtureConfig | null> {
    return this.fixtures.get(type) || null;
  }

  /**
   * Registers a new fixture configuration in the repository.
   */
  async registerFixture(config: FixtureConfig): Promise<void> {
    this.fixtures.set(config.type, config);
  }

  /**
   * Returns a list of all available fixture types.
   */
  async listAvailableTypes(): Promise<string[]> {
    return Array.from(this.fixtures.keys());
  }
}
