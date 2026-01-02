import { FixtureConfig, IFixtureRepository } from "../types";
import { STUB_FIXTURES } from "./stubs/fixtures";

/**
 * FIXTURE REPOSITORY
 *
 * Manages the definitions and semantic configurations for retail fixtures
 * (e.g., Shelves, Pegboards, Coolers, Floor Displays).
 *
 * This repository handles:
 * 1. Physical dimensions of the fixture units.
 * 2. Attachment rules (how products snap to the fixture).
 * 3. Background visual assets.
 * 4. Technical constraints (max weight, max shelves).
 */
export class FixtureRepository implements IFixtureRepository {
  // Mock internal storage for fixture definitions
  private fixtureRegistry: Map<string, FixtureConfig> = new Map();

  constructor() {
    this.initializeDefaults();
  }

  /**
   * Retrieves a fixture configuration by its unique type identifier.
   */
  public async getByType(type: string): Promise<FixtureConfig | null> {
    const fixture = this.fixtureRegistry.get(type);
    if (!fixture) {
      console.warn(
        `FixtureRepository: Unknown fixture type requested: ${type}`,
      );
      return null;
    }
    return { ...fixture };
  }

  /**
   * Registers a new fixture type into the system.
   */
  public async registerFixture(config: FixtureConfig): Promise<void> {
    this.fixtureRegistry.set(config.type, config);
  }

  /**
   * Lists all available fixture types supported by the library.
   */
  public async listAvailableTypes(): Promise<string[]> {
    return Array.from(this.fixtureRegistry.keys());
  }

  /**
   * Populates the repository with standard retail industry fixture types.
   */
  private initializeDefaults(): void {
    STUB_FIXTURES.forEach((f) => this.fixtureRegistry.set(f.type, f));
  }
}
