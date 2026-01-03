import {
  RenderInstance,
  SourceProduct,
  FixtureConfig,
  ProductMetadata,
  FacingConfig,
  PyramidConfig,
  FacingCount,
  Millimeters,
  ZIndex,
} from "@vst/vocabulary-types";
import { IPlacementModel } from "@vst/placement-core";

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
    behavioralModel: IPlacementModel,
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
    return {
      ...instance,
      metadata,

      // Layer 1: Data Layer (Physical vs Visual)
      physicalDimensions: metadata.dimensions.physical,
      visualDimensions: metadata.dimensions.visual,
      anchorPoint: metadata.dimensions.visual.anchor,

      // Layer 2: Universal Representation (Coordinates & Constraints)
      semanticCoordinates: sourceData.placement.position,
      placementModelId: behavioralModel.id,

      // Layer 3: Facings & Pyramid Logic
      facingData: this.extractFacingData(sourceData),
      pyramidData: this.extractPyramidData(sourceData),

      // Performance data for heatmaps
      performance: sourceData.performance || undefined,

      // Asset references for the renderer
      assets: {
        spriteVariants: metadata.visualProperties.spriteVariants || [],
        maskUrl: metadata.visualProperties.maskUrl || null,
        shadowConfig: metadata.visualProperties.shadowType || "standard",
      },

      // These will be populated by subsequent processors
      fixture: fixture,
      sku: sourceData.sku,
      id: instance.id || `${sourceData.id}-0`,

      depthRatio: 0,
      renderScale: 1,
      scaledDimensions: { ...metadata.dimensions.physical },

      worldPosition: { x: 0, y: 0, z: 0 },
      worldRotation: { x: 0, y: 0, z: 0 },
      worldDimensions: { ...metadata.dimensions.physical },

      depthCategory: "front",
      zIndex: 0,
      zIndexComponents: {
        shelf: 0,
        facing: 0,
        depth: 0,
      },
      visualProperties: {
        isFrontRow: true,
        isMiddleRow: false,
        isBackRow: false,
        depthCategory: "front",
      },
      zLayerProperties: {
        baseZ: 0 as ZIndex,
        shelfContribution: 0,
        facingContribution: 0,
        depthContribution: 0,
        finalZIndex: 0 as ZIndex,
      },

      shadowProperties: {
        enabled: false,
        type: "standard",
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
        maskType: "alpha-channel",
        compositeOperation: "source-over",
      },
    } as RenderInstance;
  }

  /**
   * Extracts facing configuration from source data.
   */
  private extractFacingData(product: SourceProduct): FacingConfig | null {
    if (!product.placement.facings) return null;

    return {
      horizontal: product.placement.facings.horizontal || (1 as FacingCount),
      vertical: product.placement.facings.vertical || (1 as FacingCount),
    };
  }

  /**
   * Extracts pyramid stacking data from source data.
   */
  private extractPyramidData(product: SourceProduct): PyramidConfig | null {
    return product.placement.pyramid || null;
  }
}
