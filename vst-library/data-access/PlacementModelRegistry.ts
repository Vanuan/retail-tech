/**
 * PLACEMENT MODEL REGISTRY
 * Central lookup for all available translation strategies.
 */

import {
  Vector2,
  Vector3,
  Dimensions3D,
  FixtureConfig,
  SemanticPosition,
  ExpansionIdentifier,
} from "@vst/vocabulary-types";
import {
  isPegboardGridPosition,
  isFreeform3DPosition,
  isBasketBinPosition,
  createPegboardGridPosition,
  createFreeform3DPosition,
  createBasketBinPosition,
} from "@vst/vocabulary-logic";
import { IPlacementModel, IPlacementModelRegistry } from "@vst/placement-core";
import { ShelfSurfacePlacementModel } from "./placement-models/ShelfSurfacePlacementModel";

/**
 * PLACEMENT MODEL REGISTRY IMPLEMENTATION
 *
 * Manages available placement models that determine how products are spatially
 * organized within different types of fixtures.
 *
 * Architectural Positioning:
 * - Part of the Data Access Layer to provide a unified API for structural rules.
 * - Decoupled from vocabulary-types to allow for behavioral implementation.
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
    this.register({
      id: "pegboard-grid",
      name: "Pegboard / Slatwall",
      properties: {
        supportsFacings: false, // Grid positions usually imply specific slots
        supportsShelves: false,
      },
      transform: (
        pos: SemanticPosition,
        _fixture: FixtureConfig,
        _productDims: Dimensions3D,
        _anchor: Vector2,
        _identifier?: ExpansionIdentifier,
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
        _fixture: FixtureConfig,
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
    this.register({
      id: "freeform-3d",
      name: "Freeform 3D Placement",
      properties: {
        supportsFacings: false,
        supportsShelves: false,
      },
      transform: (
        pos: SemanticPosition,
        _fixture: FixtureConfig,
        _productDims: Dimensions3D,
        _anchor: Vector2,
        _identifier?: ExpansionIdentifier,
      ): Vector3 => {
        if (!isFreeform3DPosition(pos)) return { x: 0, y: 0, z: 0 };
        return { ...pos.position };
      },
      project: (
        worldPos: Vector3,
        _fixture: FixtureConfig,
      ): SemanticPosition => {
        return createFreeform3DPosition({
          position: worldPos,
        });
      },
    });

    // ========================================================================
    // BASKET / BIN MODEL
    // ========================================================================
    this.register({
      id: "basket-bin",
      name: "Basket / Bin Container",
      properties: {
        supportsFacings: false,
        supportsShelves: false,
      },
      transform: (
        pos: SemanticPosition,
        _fixture: FixtureConfig,
        _productDims: Dimensions3D,
        _anchor: Vector2,
        _identifier?: ExpansionIdentifier,
      ): Vector3 => {
        if (!isBasketBinPosition(pos)) return { x: 0, y: 0, z: 0 };

        // Basic implementation: slots are 100mm apart horizontally by default
        const slotWidth = 100;
        const x = pos.slotIndex * slotWidth + (pos.offset?.x || 0);
        const y = pos.offset?.y || 0;
        const z = 0;

        return { x, y, z };
      },
      project: (
        worldPos: Vector3,
        _fixture: FixtureConfig,
      ): SemanticPosition => {
        const slotWidth = 100;
        return createBasketBinPosition({
          containerId: "default-bin",
          slotIndex: Math.floor(worldPos.x / slotWidth),
          offset: { x: worldPos.x % slotWidth, y: worldPos.y },
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
