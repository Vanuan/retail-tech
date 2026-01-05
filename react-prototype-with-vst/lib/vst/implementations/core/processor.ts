import {
  PlanogramConfig,
  ProcessedPlanogram,
  RenderInstance,
  SourceProduct,
  ProductMetadata,
  FixtureConfig,
  ZIndex,
  Millimeters,
  DepthLevel,
  DepthCategory,
  IDataAccessLayer,
  ICoreProcessor,
  CoreProcessInput,
  IPlanogramSnapshot,
  PlanogramAction,
  PlacementSuggestionInput,
  PlacementSuggestion,
  ValidationContext,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationErrorCode,
  ShelfIndex,
  ShelfConfig,
  SemanticPosition,
  ShelfSurfacePosition,
} from "@vst/vocabulary-types";
import { isShelfSurfacePosition, createFacingConfig } from "@vst/utils";
import { placementRegistry } from "../placement-models/registry";

/**
 * CoreProcessor
 * Implements the "L4" transformation layer.
 * Converts Semantic (L1) data into Render-Ready (L4) instances.
 *
 * ELEVATED ROLE:
 * This class now acts as the "Authority" for planogram logic, handling:
 * 1. Projection (State + Actions -> Snapshot)
 * 2. Intent Validation (Can I do this?)
 * 3. Placement Suggestions (Where should this go?)
 */
export class CoreProcessor implements ICoreProcessor {
  constructor(private dal: IDataAccessLayer) {}

  /**
   * Process a planogram configuration into a render-ready result (Async).
   */
  async processAsync(config: PlanogramConfig): Promise<ProcessedPlanogram> {
    // 1. Enrich (Fetch Metadata)
    const productSkus = new Set(config.products.map((p) => p.sku));
    const metadataMap = new Map<string, ProductMetadata>();

    for (const sku of Array.from(productSkus)) {
      const meta = await this.dal.products.getBySku(sku);
      if (meta) {
        metadataMap.set(sku, meta);
      }
    }

    return this.process({ config, metadata: metadataMap });
  }

  /**
   * Applies actions to a configuration and produces a complete snapshot.
   */
  project(
    config: PlanogramConfig,
    actions: readonly PlanogramAction[],
    metadata: ReadonlyMap<string, ProductMetadata>,
  ): IPlanogramSnapshot {
    // 1. Apply Actions (Derive L1 State)
    const derivedConfig = this.applyActions(config, actions);

    // 2. Process (Generate L4 State)
    const processed = this.process({ config: derivedConfig, metadata });

    // 3. Return Snapshot
    return {
      ...processed,
      config: derivedConfig,
    };
  }

  /**
   * Calculates the best placement for a product based on business rules.
   */
  suggestPlacement(
    input: PlacementSuggestionInput,
  ): PlacementSuggestion | null {
    const { sku, preferredShelf, constraints, metadata, actions } = input;
    const config = actions
      ? this.applyActions(input.config, actions)
      : input.config;
    const meta = metadata.get(sku);

    if (!meta) {
      console.error(`Cannot suggest placement: Metadata not found for ${sku}`);
      return null;
    }

    const shelves = (config.fixture.config.shelves as ShelfConfig[]) || [];
    const allIndices = shelves.map((s) => s.index as ShelfIndex);

    if (allIndices.length === 0) return null;

    // Determine shelf check order
    let checkOrder: ShelfIndex[] = [];

    if (constraints?.allowedShelves) {
      checkOrder = constraints.allowedShelves.filter((i) =>
        allIndices.includes(i),
      );
    } else {
      const targetIndex =
        preferredShelf !== undefined && allIndices.includes(preferredShelf)
          ? preferredShelf
          : allIndices[0];

      checkOrder = [
        targetIndex as ShelfIndex,
        ...allIndices.filter((i) => i !== targetIndex),
      ];
    }

    // Scan shelves for space (prefer front rows across all allowed shelves)
    for (const depth of [0, 1, 2, 3] as const) {
      for (const shelfIndex of checkOrder) {
        const shelfWidth = config.fixture.dimensions.width;
        const productWidth = meta.dimensions.physical.width;

        // Get all products already on this shelf and depth
        const existingProducts = config.products
          .filter((p) => {
            const pos = p.placement.position;
            return (
              isShelfSurfacePosition(pos) &&
              pos.shelfIndex === shelfIndex &&
              (pos.depth || 0) === depth
            );
          })
          .map((p) => {
            const pMeta = metadata.get(p.sku);
            const pW =
              (pMeta?.dimensions.physical.width || 0) *
              (p.placement.facings?.horizontal || 1);
            return {
              x: (p.placement.position as ShelfSurfacePosition).x,
              width: pW,
            };
          })
          .sort((a, b) => a.x - b.x);

        // Candidate positions: Start of shelf, and after every existing product
        const candidates = [0, ...existingProducts.map((p) => p.x + p.width)];

        for (const candidateX of candidates) {
          if (candidateX + productWidth > shelfWidth) continue;

          // Check for collision at this candidate position
          const hasCollision = existingProducts.some((p) => {
            return (
              candidateX < p.x + p.width - 0.5 &&
              candidateX + productWidth > p.x + 0.5
            );
          });

          if (!hasCollision) {
            const suggested = {
              position: {
                model: "shelf-surface",
                shelfIndex,
                x: candidateX as Millimeters,
                depth: depth as DepthLevel,
              } as ShelfSurfacePosition,
            };
            return suggested;
          }
        }
      }
    }

    // No space found on any allowed shelf
    return null;
  }

  /**
   * Validates if an action is permissible under business rules.
   */
  validateIntent(
    action: PlanogramAction,
    context: ValidationContext,
  ): ValidationResult {
    const { metadata, actions } = context;
    const config = actions
      ? this.applyActions(context.config, actions)
      : context.config;

    switch (action.type) {
      case "PRODUCT_ADD":
        return this.validatePlacement(
          config,
          metadata,
          action.product.sku,
          action.product.placement.position,
          action.product.placement.facings?.horizontal || 1,
          action.product.id,
        );

      case "PRODUCT_MOVE": {
        const product = config.products.find((p) => p.id === action.productId);
        if (!product) {
          return {
            valid: false,
            canRender: false,
            errors: [
              {
                code: "PRODUCT_NOT_FOUND" as ValidationErrorCode,
                message: "Product not found",
              },
            ],
            warnings: [],
          };
        }
        return this.validatePlacement(
          config,
          metadata,
          product.sku,
          action.to,
          product.placement.facings?.horizontal || 1,
          action.productId,
        );
      }

      case "PRODUCT_UPDATE_FACINGS": {
        const product = config.products.find((p) => p.id === action.productId);
        if (!product) {
          return {
            valid: false,
            canRender: false,
            errors: [
              {
                code: "PRODUCT_NOT_FOUND" as ValidationErrorCode,
                message: "Product not found",
              },
            ],
            warnings: [],
          };
        }
        return this.validatePlacement(
          config,
          metadata,
          product.sku,
          product.placement.position,
          action.facings.horizontal,
          action.productId,
        );
      }

      case "BATCH": {
        let currentConfig = config;
        let valid = true;
        let canRender = true;
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        for (const subAction of action.actions) {
          const result = this.validateIntent(subAction, {
            config: currentConfig,
            metadata,
          });

          if (!result.valid) valid = false;
          if (!result.canRender) canRender = false;
          errors.push(...result.errors);
          warnings.push(...result.warnings);

          if (result.valid) {
            currentConfig = this.reduceAction(currentConfig, subAction);
          }
        }

        return {
          valid,
          canRender,
          errors,
          warnings,
        };
      }

      // TODO: Implement validation for other actions
      default:
        return {
          valid: true,
          canRender: true,
          errors: [],
          warnings: [],
        };
    }
  }

  /**
   * Core projection logic.
   * Translates L1 + L3 into an L4 ProcessedPlanogram.
   */
  process(input: CoreProcessInput): ProcessedPlanogram {
    const { config, metadata: metadataSource } = input;
    const startTime = performance.now();
    const renderInstances: RenderInstance[] = [];
    const processingErrors: any[] = [];
    let validInstances = 0;
    let invalidCount = 0;

    const getMetadata = (sku: string) => {
      return metadataSource.get(sku);
    };

    // 2. Transform (L4 Generation)
    for (const product of config.products) {
      const metadata = getMetadata(product.sku);
      if (!metadata) {
        invalidCount++;
        processingErrors.push({
          productId: product.id,
          error: "Metadata not found",
        });
        continue;
      }

      try {
        const instances = this.generateInstancesForProduct(
          product,
          config.fixture,
          metadata,
        );
        renderInstances.push(...instances);
        validInstances += instances.length;
      } catch (e) {
        invalidCount++;
        processingErrors.push({ productId: product.id, error: e });
      }
    }

    // Sort by Z-Index for painter's algorithm
    renderInstances.sort((a, b) => a.zIndex - b.zIndex);

    return {
      renderInstances,
      fixture: config.fixture,
      metadata: {
        totalInstances: renderInstances.length,
        validInstances,
        invalidCount,
        processingTime: performance.now() - startTime,
        processingErrors,
      },
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Applies a list of actions to a base configuration.
   * Pure function: Returns a new configuration object.
   */
  private applyActions(
    base: PlanogramConfig,
    actions: readonly PlanogramAction[],
  ): PlanogramConfig {
    return actions.reduce(
      (config, action) => this.reduceAction(config, action),
      base,
    );
  }

  private reduceAction(
    config: PlanogramConfig,
    action: PlanogramAction,
  ): PlanogramConfig {
    switch (action.type) {
      case "PRODUCT_MOVE": {
        return {
          ...config,
          products: config.products.map((p) =>
            p.id === action.productId
              ? { ...p, placement: { ...p.placement, position: action.to } }
              : p,
          ),
        };
      }
      case "PRODUCT_ADD": {
        return {
          ...config,
          products: [...config.products, action.product],
        };
      }
      case "PRODUCT_REMOVE": {
        return {
          ...config,
          products: config.products.filter((p) => p.id !== action.productId),
        };
      }
      case "PRODUCT_UPDATE_FACINGS": {
        return {
          ...config,
          products: config.products.map((p) =>
            p.id === action.productId
              ? {
                  ...p,
                  placement: { ...p.placement, facings: action.facings },
                }
              : p,
          ),
        };
      }
      case "SHELF_ADD": {
        const shelves = (config.fixture.config.shelves as ShelfConfig[]) || [];
        return {
          ...config,
          fixture: {
            ...config.fixture,
            config: {
              ...config.fixture.config,
              shelves: [...shelves, action.shelf],
            },
          },
        };
      }
      case "SHELF_REMOVE": {
        const shelves = (config.fixture.config.shelves as ShelfConfig[]) || [];
        return {
          ...config,
          fixture: {
            ...config.fixture,
            config: {
              ...config.fixture.config,
              shelves: shelves.filter((s) => s.index !== action.index),
            },
          },
        };
      }
      case "SHELF_UPDATE": {
        const shelves = (config.fixture.config.shelves as ShelfConfig[]) || [];
        return {
          ...config,
          fixture: {
            ...config.fixture,
            config: {
              ...config.fixture.config,
              shelves: shelves.map((s) =>
                s.index === action.index ? { ...s, ...action.updates } : s,
              ),
            },
          },
        };
      }
      case "FIXTURE_UPDATE": {
        const { config: updateConfig, ...updateOthers } = action.updates;
        const resultFixture = {
          ...config.fixture,
          ...updateOthers,
        };
        if (updateConfig) {
          resultFixture.config = {
            ...config.fixture.config,
            ...(updateConfig as Record<string, unknown>),
          };
        }
        return {
          ...config,
          fixture: resultFixture,
        };
      }
      case "BATCH": {
        return action.actions.reduce(
          (cfg, subAction) => this.reduceAction(cfg, subAction),
          config,
        );
      }
      default:
        return config;
    }
  }

  private getShelfSpaceUsed(
    config: PlanogramConfig,
    metadata: ReadonlyMap<string, ProductMetadata>,
    shelfIndex: number,
    depth: number = 0,
  ): number {
    let maxX = 0;
    for (const p of config.products) {
      const pos = p.placement.position;
      if (
        isShelfSurfacePosition(pos) &&
        pos.shelfIndex === shelfIndex &&
        (pos.depth || 0) === depth
      ) {
        const meta = metadata.get(p.sku);
        if (meta) {
          const w =
            meta.dimensions.physical.width *
            (p.placement.facings?.horizontal || 1);
          maxX = Math.max(maxX, pos.x + w);
        }
      }
    }
    return maxX;
  }

  private validatePlacement(
    config: PlanogramConfig,
    metadata: ReadonlyMap<string, ProductMetadata>,
    sku: string,
    position: SemanticPosition,
    facings: number,
    excludeId?: string,
  ): ValidationResult {
    // 1. Basic Bounds Check
    if (!isShelfSurfacePosition(position)) {
      return { valid: true, canRender: true, errors: [], warnings: [] };
    }

    const meta = metadata.get(sku);
    if (!meta) {
      return {
        valid: false,
        canRender: false,
        errors: [
          {
            code: "METADATA_MISSING" as ValidationErrorCode,
            message: "Metadata not found",
          },
        ],
        warnings: [],
      };
    }

    const width = meta.dimensions.physical.width * facings;
    const fixtureWidth = config.fixture.dimensions.width;

    if (position.x < 0 || position.x + width > fixtureWidth) {
      return {
        valid: false,
        canRender: true,
        errors: [
          {
            code: "OUT_OF_BOUNDS" as ValidationErrorCode,
            message: "Placement is out of bounds",
          },
        ],
        warnings: [],
      };
    }

    // 2. Collision Check
    const collision = config.products.some((p) => {
      if (p.id === excludeId) return false;
      const pPos = p.placement.position;
      if (
        !isShelfSurfacePosition(pPos) ||
        pPos.shelfIndex !== position.shelfIndex ||
        (pPos.depth || 0) !== (position.depth || 0)
      )
        return false;

      const pMeta = metadata.get(p.sku);
      const pW =
        (pMeta?.dimensions.physical.width || 0) *
        (p.placement.facings?.horizontal || 1);

      // AABB overlap test
      return (
        position.x < pPos.x + pW - 0.5 && position.x + width > pPos.x + 0.5
      );
    });

    if (collision) {
      return {
        valid: false,
        canRender: true,
        errors: [
          {
            code: "COLLISION" as ValidationErrorCode,
            message: "Product collides with another product",
          },
        ],
        warnings: [],
      };
    }

    return { valid: true, canRender: true, errors: [], warnings: [] };
  }

  /**
   * Generates expanded render instances for a single source product.
   */
  private generateInstancesForProduct(
    product: SourceProduct,
    fixture: FixtureConfig,
    metadata: ProductMetadata,
  ): RenderInstance[] {
    const instances: RenderInstance[] = [];
    const facings = product.placement.facings || createFacingConfig(1, 1);

    // Get Placement Model
    const modelType = product.placement.position.model;
    const pModel =
      placementRegistry.get(modelType) ||
      placementRegistry.get("shelf-surface");

    if (!pModel) {
      throw new Error(`Placement model '${modelType}' not found`);
    }

    for (let facingX = 0; facingX < facings.horizontal; facingX++) {
      for (let facingY = 0; facingY < facings.vertical; facingY++) {
        // STEP 1 & 2: Facing Expansion & Transform
        const worldPos = pModel.transform(
          product.placement.position,
          fixture,
          metadata.dimensions.physical,
          metadata.dimensions.visual.anchor,
          { facingX, facingY },
        );

        // STEP 3: Depth Scaling
        let depth = 0;
        let shelfIndex = 0;

        if (isShelfSurfacePosition(product.placement.position)) {
          depth = product.placement.position.depth || 0;
          shelfIndex = product.placement.position.shelfIndex;
        }

        const depthScale = depth === 0 ? 1.0 : Math.pow(0.92, depth);

        // STEP 4: Z-Index Calculation
        const zIndexComponents = {
          shelf: shelfIndex,
          facing: facingX,
          depth: depth,
        };

        const zIndex = (1000 +
          shelfIndex * 100 -
          depth * 10 +
          facingX) as ZIndex;

        // Calculate visual properties
        const depthCategory: DepthCategory =
          depth === 0 ? "front" : depth === 1 ? "middle" : "back";

        // Create the RenderInstance
        const instance: RenderInstance = {
          id: `${product.id}-${facingX}-${facingY}`,
          sku: product.sku,
          sourceData: product,
          fixture: fixture,
          placementModelId: pModel.id,
          metadata: metadata,

          physicalDimensions: metadata.dimensions.physical,
          visualDimensions: metadata.dimensions.visual,
          anchorPoint: metadata.dimensions.visual.anchor,

          worldPosition: worldPos,
          worldRotation: { x: 0, y: 0, z: 0 },
          worldDimensions: metadata.dimensions.physical,

          semanticCoordinates: product.placement.position,
          facingData: product.placement.facings || null,
          pyramidData: product.placement.pyramid || null,

          depthRatio: depthScale,
          renderScale: depthScale,
          scaledDimensions: {
            width: (metadata.dimensions.physical.width *
              depthScale) as Millimeters,
            height: (metadata.dimensions.physical.height *
              depthScale) as Millimeters,
            depth: (metadata.dimensions.physical.depth *
              depthScale) as Millimeters,
          },

          depthCategory,
          zIndexComponents,
          zIndex,
          visualProperties: {
            isFrontRow: depth === 0,
            isMiddleRow: depth === 1,
            isBackRow: depth > 1,
            depthCategory,
          },

          zLayerProperties: {
            baseZ: 1000 as ZIndex,
            shelfContribution: shelfIndex * 100,
            depthContribution: depth * -10,
            facingContribution: facingX,
            finalZIndex: zIndex,
          },

          shadowProperties: {
            enabled: true,
            type: metadata.visualProperties.shadowType || "standard",
            intensity: 0.3,
            offset: { x: 0, y: 4 },
            blur: 8,
            color: "rgba(0,0,0,0.3)",
            needsShadow: true,
          },

          maskProperties: {
            required: !!metadata.visualProperties.maskUrl,
            maskUrl: metadata.visualProperties.maskUrl || null,
            transparency: !!metadata.visualProperties.hasTransparency,
            maskType: "alpha-channel",
            compositeOperation: "destination-in",
          },

          assets: {
            spriteVariants: metadata.visualProperties.spriteVariants,
            maskUrl: metadata.visualProperties.maskUrl || null,
            shadowConfig: "default",
          },
        };

        instances.push(instance);
      }
    }

    return instances;
  }
}
