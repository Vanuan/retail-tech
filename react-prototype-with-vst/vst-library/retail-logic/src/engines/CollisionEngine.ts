import {
  PlanogramConfig,
  ProductMetadata,
  SemanticPosition,
  ShelfSurfacePosition,
  SourceProduct,
} from "@vst/vocabulary-types";
import { isShelfSurfacePosition } from "@vst/vocabulary-logic";
import { Collision, CollisionMap } from "../types";

export class CollisionEngine {
  /**
   * High-speed check for all product overlaps in the planogram.
   */
  public getCollisions(
    config: PlanogramConfig,
    metadata: ReadonlyMap<string, ProductMetadata>
  ): CollisionMap {
    const collisionMap: CollisionMap = new Map();
    const products = config.products;

    // Group products by shelf and depth to optimize checks
    const buckets = new Map<string, SourceProduct[]>();

    for (const p of products) {
      if (!isShelfSurfacePosition(p.placement.position)) continue;

      const key = `${p.placement.position.shelfIndex}:${
        p.placement.position.depth || 0
      }`;
      if (!buckets.has(key)) {
        buckets.set(key, []);
      }
      buckets.get(key)!.push(p);
    }

    for (const [key, shelfProducts] of buckets) {
      // Check collisions within this shelf/depth
      for (let i = 0; i < shelfProducts.length; i++) {
        const p1 = shelfProducts[i];
        const meta1 = metadata.get(p1.sku);
        if (!meta1) continue;

        const p1Pos = p1.placement.position as ShelfSurfacePosition;
        const p1Width =
          meta1.dimensions.physical.width *
          (p1.placement.facings?.horizontal || 1);
        const p1Start = p1Pos.x;
        const p1End = p1Pos.x + p1Width;

        for (let j = i + 1; j < shelfProducts.length; j++) {
          const p2 = shelfProducts[j];
          const meta2 = metadata.get(p2.sku);
          if (!meta2) continue;

          const p2Pos = p2.placement.position as ShelfSurfacePosition;
          const p2Width =
            meta2.dimensions.physical.width *
            (p2.placement.facings?.horizontal || 1);
          const p2Start = p2Pos.x;
          const p2End = p2Pos.x + p2Width;

          // AABB Collision Test
          // Using 0.5 tolerance as seen in legacy processor
          const isColliding =
            p1Start < p2End - 0.5 && p1End > p2Start + 0.5;

          if (isColliding) {
            const overlap =
              Math.min(p1End, p2End) - Math.max(p1Start, p2Start);

            // Register collision for p1
            this.addCollision(collisionMap, p1.id, {
              sourceId: p1.id,
              targetId: p2.id,
              overlap,
              position: p1Pos.x,
            });

            // Register collision for p2
            this.addCollision(collisionMap, p2.id, {
              sourceId: p2.id,
              targetId: p1.id,
              overlap,
              position: p2Pos.x,
            });
          }
        }
      }
    }

    return collisionMap;
  }

  /**
   * Checks if a specific hypothetical placement collides with existing products.
   */
  public checkCollision(
    config: PlanogramConfig,
    metadata: ReadonlyMap<string, ProductMetadata>,
    targetSku: string,
    targetPosition: SemanticPosition,
    targetFacings: number = 1,
    excludeProductId?: string
  ): boolean {
    if (!isShelfSurfacePosition(targetPosition)) {
      return false;
    }

    const targetMeta = metadata.get(targetSku);
    if (!targetMeta) return false;

    const targetWidth = targetMeta.dimensions.physical.width * targetFacings;
    const targetStart = targetPosition.x;
    const targetEnd = targetPosition.x + targetWidth;

    // Iterate existing products
    for (const p of config.products) {
      if (p.id === excludeProductId) continue;

      const pPos = p.placement.position;
      if (!isShelfSurfacePosition(pPos)) continue;

      // Must be same shelf and depth
      if (pPos.shelfIndex !== targetPosition.shelfIndex) continue;
      if ((pPos.depth || 0) !== (targetPosition.depth || 0)) continue;

      const pMeta = metadata.get(p.sku);
      if (!pMeta) continue;

      const pWidth =
        pMeta.dimensions.physical.width *
        (p.placement.facings?.horizontal || 1);
      const pStart = pPos.x;
      const pEnd = pPos.x + pWidth;

      // Collision Check with tolerance
      if (targetStart < pEnd - 0.5 && targetEnd > pStart + 0.5) {
        return true;
      }
    }

    return false;
  }

  private addCollision(map: CollisionMap, key: string, collision: Collision) {
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(collision);
  }
}
