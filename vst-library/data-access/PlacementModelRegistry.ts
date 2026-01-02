import {
  SemanticPosition,
  FixtureConfig,
  Vector2,
  Vector3,
  Dimensions3D,
  IPlacementModel,
  IPlacementModelRegistry,
  ExpansionIdentifier,
  isShelfSurfacePosition,
  isPegboardGridPosition,
  isFreeform3DPosition,
  createShelfSurfacePosition,
  createPegboardGridPosition,
  createFreeform3DPosition,
} from "../types";
import { ShelfSurfacePlacementModel } from "./placement-models/ShelfSurfacePlacementModel";

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
    // ========================================================================
    // SHELF SURFACE MODEL
    // ========================================================================
    this.register(new ShelfSurfacePlacementModel());

    // ========================================================================
    // PEGBOARD / GRID MODEL
    // ========================================================================
    this.models.set("pegboard-grid", {
      id: "pegboard-grid",
      name: "Pegboard / Slatwall",
      properties: {
        supportsFacings: false, // Grid positions usually imply specific slots
        supportsShelves: false,
      },
      transform: (
        pos: SemanticPosition,
        fixture: FixtureConfig,
        productDims: Dimensions3D,
        anchor: Vector2,
        identifier?: ExpansionIdentifier,
      ): Vector3 => {
        if (!isPegboardGridPosition(pos)) return { x: 0, y: 0, z: 0 };

        const spacing = pos.gridSpacing || 25.4;

        // Calculate absolute position based on grid indices
        const x = pos.holeX * spacing;
        const y = pos.holeY * spacing;
        const z = 0; // Pegboard items are usually flush or have hook offsets handled by sprite anchor

        return { x, y, z };
      },
      project: (
        worldPos: Vector3,
        fixture: FixtureConfig,
      ): SemanticPosition => {
        const spacing = 25.4;
        return createPegboardGridPosition({
          holeX: Math.round(worldPos.x / spacing),
          holeY: Math.round(worldPos.y / spacing),
        });
      },
    });

    // ========================================================================
    // FREEFORM 3D MODEL
    // ========================================================================
    this.models.set("freeform-3d", {
      id: "freeform-3d",
      name: "Freeform 3D Placement",
      properties: {
        supportsFacings: false,
        supportsShelves: false,
      },
      transform: (
        pos: SemanticPosition,
        fixture: FixtureConfig,
        productDims: Dimensions3D,
        anchor: Vector2,
        identifier?: ExpansionIdentifier,
      ): Vector3 => {
        if (!isFreeform3DPosition(pos)) return { x: 0, y: 0, z: 0 };
        return { ...pos.position };
      },
      project: (
        worldPos: Vector3,
        fixture: FixtureConfig,
      ): SemanticPosition => {
        return createFreeform3DPosition({
          position: worldPos,
        });
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
