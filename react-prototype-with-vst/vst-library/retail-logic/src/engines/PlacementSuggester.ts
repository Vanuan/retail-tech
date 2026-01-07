import {
  PlacementSuggestion,
  ShelfSurfacePosition,
  Millimeters,
  DepthLevel,
  ShelfIndex,
  ShelfConfig,
  PlanogramConfig,
  ProductMetadata,
  PlanogramAction,
} from "@vst/vocabulary-types";
import { isShelfSurfacePosition } from "@vst/vocabulary-logic";
import { SuggestionRequest } from "../types";
import { CollisionEngine } from "./CollisionEngine";

export class PlacementSuggester {
  constructor(private collisionEngine: CollisionEngine) {}

  public suggest(request: SuggestionRequest): PlacementSuggestion | null {
    const { sku, preferredShelf, constraints, metadata, config, actions } =
      request;

    const meta = metadata.get(sku);
    if (!meta) {
      return null;
    }

    const shelves = (config.fixture.config.shelves as ShelfConfig[]) || [];
    const allIndices = shelves.map((s) => s.index as ShelfIndex);

    if (allIndices.length === 0) return null;

    // 1. Determine Shelf Order
    let checkOrder: ShelfIndex[] = [];

    if (constraints?.allowedShelves) {
      checkOrder = constraints.allowedShelves.filter((i) =>
        allIndices.includes(i),
      );
    } else {
      const targetIndex =
        preferredShelf !== undefined &&
        preferredShelf !== null &&
        allIndices.includes(preferredShelf)
          ? preferredShelf
          : allIndices[0];

      checkOrder = [
        targetIndex as ShelfIndex,
        ...allIndices.filter((i) => i !== targetIndex),
      ];
    }

    // 2. Scan Shelves (Front-to-Back Strategy)
    for (const depth of [0, 1, 2, 3] as const) {
      for (const shelfIndex of checkOrder) {
        const suggestion = this.findSpotOnShelf(
          config,
          metadata,
          sku,
          shelfIndex,
          depth,
          actions,
        );
        if (suggestion) return suggestion;
      }
    }

    return null;
  }

  private findSpotOnShelf(
    config: PlanogramConfig,
    metadata: ReadonlyMap<string, ProductMetadata>,
    sku: string,
    shelfIndex: number,
    depth: number,
    actions?: readonly PlanogramAction[],
  ): PlacementSuggestion | null {
    const shelfWidth = config.fixture.dimensions.width;
    const meta = metadata.get(sku);
    if (!meta) return null;
    const productWidth = meta.dimensions.physical.width;

    // Get occupied spaces (accounting for pending actions)
    const occupiedSpaces = this.getOccupiedSpaces(
      config,
      metadata,
      shelfIndex,
      depth,
      actions,
    );

    // Candidates: Start of shelf, and after every existing product
    // This implements the "Left-to-Right" strategy
    const candidates = [0, ...occupiedSpaces.map((p) => p.x + p.width)];

    for (const candidateX of candidates) {
      if (candidateX + productWidth > shelfWidth) continue;

      // Check Collision locally against the resolved spaces
      const hasCollision = occupiedSpaces.some((p) => {
        // AABB with 0.5mm tolerance
        return (
          candidateX < p.x + p.width - 0.5 &&
          candidateX + productWidth > p.x + 0.5
        );
      });

      if (!hasCollision) {
        return {
          position: {
            model: "shelf-surface",
            shelfIndex,
            x: candidateX as Millimeters,
            depth: depth as DepthLevel,
          } as ShelfSurfacePosition,
        };
      }
    }

    return null;
  }

  /**
   * Builds a list of occupied spaces on a specific shelf/depth,
   * factoring in both the base config and any pending actions.
   */
  private getOccupiedSpaces(
    config: PlanogramConfig,
    metadata: ReadonlyMap<string, ProductMetadata>,
    shelfIndex: number,
    depth: number,
    actions?: readonly PlanogramAction[],
  ): { x: number; width: number; id: string }[] {
    const spaces: { x: number; width: number; id: string }[] = [];

    // 1. Initial State from Config
    for (const p of config.products) {
      const pos = p.placement.position;
      if (
        isShelfSurfacePosition(pos) &&
        pos.shelfIndex === shelfIndex &&
        (pos.depth || 0) === depth
      ) {
        const meta = metadata.get(p.sku);
        if (meta) {
          const width =
            meta.dimensions.physical.width *
            (p.placement.facings?.horizontal || 1);
          spaces.push({ x: pos.x, width, id: p.id });
        }
      }
    }

    // 2. Apply Pending Actions (Simulation)
    if (actions) {
      for (const action of actions) {
        if (action.type === "PRODUCT_ADD") {
          const p = action.product;
          if (p.placement && isShelfSurfacePosition(p.placement.position)) {
            const pos = p.placement.position;
            if (pos.shelfIndex === shelfIndex && (pos.depth || 0) === depth) {
              const meta = metadata.get(p.sku);
              if (meta) {
                const width =
                  meta.dimensions.physical.width *
                  (p.placement.facings?.horizontal || 1);
                spaces.push({ x: pos.x, width, id: "pending" });
              }
            }
          }
        } else if (action.type === "PRODUCT_MOVE") {
          const { productId, to } = action;

          // A. Remove from old spot (if it was on this shelf/depth)
          // We search by ID.
          const idx = spaces.findIndex((s) => s.id === productId);
          if (idx !== -1) {
            spaces.splice(idx, 1);
          }

          // B. Add to new spot (if it is on this shelf/depth)
          if (isShelfSurfacePosition(to)) {
            const pos = to;
            if (pos.shelfIndex === shelfIndex && (pos.depth || 0) === depth) {
              // Find original product to get SKU/Dimensions
              const existing = config.products.find((p) => p.id === productId);
              if (existing) {
                const meta = metadata.get(existing.sku);
                if (meta) {
                  const width =
                    meta.dimensions.physical.width *
                    (existing.placement.facings?.horizontal || 1);
                  spaces.push({ x: pos.x, width, id: productId });
                }
              }
            }
          }
        } else if (action.type === "PRODUCT_REMOVE") {
          const idx = spaces.findIndex((s) => s.id === action.productId);
          if (idx !== -1) spaces.splice(idx, 1);
        }
      }
    }

    return spaces.sort((a, b) => a.x - b.x);
  }
}
