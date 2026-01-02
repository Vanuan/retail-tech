import {
  RenderInstance,
  SourceProduct,
  FixtureConfig,
  ProductMetadata,
  FacingData,
  PyramidConfig,
  IPlacementModel,
} from "../types";

/**
 * PRODUCT INSTANCE GENERATOR
 * Combines L1-L3 data into prepared instances.
 * This is the first step in the core processing pipeline, responsible for
 * merging raw source data with enriched metadata.
 */
export class ProductInstanceGenerator {
  /**
   * Initial process step: Hydrates a base instance with metadata and structural properties.
   */
  async process(
    instance: Partial<RenderInstance>,
    fixture: FixtureConfig,
    placementModel: IPlacementModel,
  ): Promise<RenderInstance> {
    const registries = (instance as any).registries;
    const sourceData = instance.sourceData as SourceProduct;

    // 1. Load product metadata from the repository
    const metadata: ProductMetadata | null =
      await registries.metadataStore.getBySku(sourceData.sku);

    if (!metadata) {
      throw new Error(`Metadata not found for SKU: ${sourceData.sku}`);
    }

    // 2. Combine all data sources into the RenderInstance structure
    // We cast to RenderInstance as this processor satisfies the base requirements
    return {
      ...instance,
      metadata,

      // Layer 1: Data Layer (Physical vs Visual)
      physicalDimensions: metadata.dimensions.physical,
      visualDimensions: metadata.dimensions.visual,
      anchorPoint: metadata.dimensions.visual.anchor,

      // Layer 2: Universal Representation (Coordinates & Constraints)
      semanticCoordinates: sourceData.placement.coordinates,
      // Default constraints to empty object if not provided
      constraints: sourceData.placement.constraints || {},

      // Layer 3: Facings & Pyramid Logic
      facingData: this.extractFacingData(sourceData),
      pyramidData: this.extractPyramidData(sourceData),

      // Performance data for heatmaps
      performance: sourceData.performance || null,

      // Asset references for the renderer
      assets: {
        spriteVariants: metadata.visualProperties.spriteVariants || [],
        maskUrl: metadata.visualProperties.maskUrl || null,
        shadowConfig: metadata.visualProperties.shadowType || "standard",
      },

      // These will be populated by subsequent processors
      depthRatio: 0,
      renderScale: 1,
      scaledDimensions: { ...metadata.dimensions.physical },
      visualProperties: {
        isFrontRow: true,
        isMiddleRow: false,
        isBackRow: false,
        depthCategory: "front",
      },
      zIndex: 0,
      zLayerProperties: {
        baseZ: 0,
        shelfContribution: 0,
        facingContribution: 0,
        depthContribution: 0,
        finalZIndex: 0,
      },
      renderCoordinates: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        baseline: { x: 0, y: 0 },
        anchorPoint: metadata.dimensions.visual.anchor,
        rotation: 0,
        scale: 1,
      },
      renderBounds: { x: 0, y: 0, width: 0, height: 0, center: { x: 0, y: 0 } },
      collisionBounds: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        center: { x: 0, y: 0 },
      },
      shadowProperties: {
        enabled: false,
        type: "none",
        intensity: 0,
        offset: { x: 0, y: 0 },
        blur: 0,
        color: "",
        needsShadow: false,
      },
      maskProperties: {
        required: false,
        maskUrl: null,
        transparency: false,
        maskType: "outline",
        compositeOperation: "source-over",
      },
    } as RenderInstance;
  }

  /**
   * Extracts facing count logic from source data.
   */
  private extractFacingData(product: SourceProduct): FacingData | null {
    if (!product.placement.facings) return null;

    const horizontal = product.placement.facings.horizontal || 1;
    const vertical = product.placement.facings.vertical || 1;

    return {
      horizontal,
      vertical,
      totalFacings: horizontal * vertical,
    };
  }

  /**
   * Extracts pyramid stacking data from source data.
   */
  private extractPyramidData(product: SourceProduct): PyramidConfig | null {
    return product.placement.pyramid || null;
  }
}
