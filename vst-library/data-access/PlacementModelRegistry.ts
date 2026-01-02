import {
  SemanticCoordinates,
  FixtureConfig,
  Vector3,
  IPlacementModel,
  IPlacementModelRegistry,
} from "../types";

/**
 * PLACEMENT MODEL REPOSITORY
 *
 * Manages available placement models that determine how products are spatially
 * organized within different types of fixtures.
 *
 * Architectural Positioning:
 * - Part of the Data Access Layer to provide a unified API for structural rules.
 * - Used by Core Layer Processing to calculate initial 3D positions.
 */
export class PlacementModelRegistry implements IPlacementModelRegistry {
  private models: Map<string, IPlacementModel> = new Map();

  constructor() {
    this.initializeDefaultModels();
  }

  /**
   * Pre-loads standard retail placement models.
   */
  private initializeDefaultModels(): void {
    // Standard Shelf Model: Calculates positions based on shelf levels and facing indices.
    this.models.set("shelf-linear", {
      id: "shelf-linear",
      name: "Standard Shelf Model",
      transform: (
        coordinates: SemanticCoordinates,
        fixtureConfig: FixtureConfig,
      ): Vector3 => {
        const {
          x: absoluteX,
          shelfIndex = 0,
          facing = 1,
          depth = 0,
        } = coordinates;
        const { width } = fixtureConfig.dimensions;

        // Prioritize absolute X coordinate (retail truth in mm) if provided.
        // Fallback to logical facing calculation if X is missing.
        const x =
          absoluteX !== undefined ? absoluteX : (facing - 1) * (width / 5);
        const y = shelfIndex * 200; // Assume 200mm vertical spacing as default
        const z = depth;

        return { x, y, z };
      },
      properties: {
        supportsFacings: true,
        supportsShelves: true,
      },
    });

    // Hole Grid Model: Used for Pegboards and Slatwalls.
    this.models.set("hole-grid", {
      id: "hole-grid",
      name: "Hole Grid Model",
      transform: (
        coordinates: SemanticCoordinates,
        fixtureConfig: FixtureConfig,
      ): Vector3 => {
        const {
          x: absoluteX,
          y: absoluteY,
          holeX = 0,
          holeY = 0,
          depth = 0,
        } = coordinates;
        const spacingX = fixtureConfig.config?.holeSpacingX || 25.4;
        const spacingY = fixtureConfig.config?.holeSpacingY || 25.4;

        // Prioritize absolute coordinates (retail truth) if available.
        const x = absoluteX !== undefined ? absoluteX : holeX * spacingX;
        const y = absoluteY !== undefined ? absoluteY : holeY * spacingY;
        const z = depth;

        return { x, y, z };
      },
      properties: {
        supportsFacings: false,
        supportsShelves: false,
      },
    });

    // Grid Model: Used for coolers and structured fixtures.
    this.models.set("grid", {
      id: "grid",
      name: "Standard Grid Model",
      transform: (
        coordinates: SemanticCoordinates,
        fixtureConfig: FixtureConfig,
      ): Vector3 => {
        const {
          x: absoluteX,
          y: absoluteY,
          shelfIndex = 0,
          depth = 0,
        } = coordinates;

        // In grid models, products are often placed with absolute mm X
        // Y is either absolute or derived from shelfIndex.
        const x = absoluteX !== undefined ? absoluteX : 0;
        const y = absoluteY !== undefined ? absoluteY : shelfIndex * 333; // Approx 333mm shelf height for coolers
        const z = depth;

        return { x, y, z };
      },
      properties: {
        supportsFacings: true,
        supportsShelves: true,
      },
    });

    // Free-form Model: Used for floor stacks or custom placements.
    this.models.set("free-form", {
      id: "free-form",
      name: "Free-form Model",
      transform: (
        coordinates: SemanticCoordinates,
        fixtureConfig: FixtureConfig,
      ): Vector3 => {
        const { x = 0, y = 0, z = 0 } = coordinates;
        return { x, y, z };
      },
      properties: {
        supportsFacings: false,
        supportsShelves: false,
      },
    });
  }

  /**
   * Retrieves a placement model by its unique identifier.
   */
  public get(id: string): IPlacementModel | null {
    return this.models.get(id) || null;
  }

  /**
   * Registers a new placement model implementation.
   */
  public register(model: IPlacementModel): void {
    if (!model || !model.id) {
      throw new Error(
        "PlacementModelRegistry: Cannot register a model without a valid ID.",
      );
    }
    this.models.set(model.id, model);
  }

  /**
   * Returns all registered placement models.
   */
  public getAll(): IPlacementModel[] {
    return Array.from(this.models.values());
  }
}
