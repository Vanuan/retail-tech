import {
  PlanogramConfig,
  ProcessedPlanogram,
  RenderInstance,
  IFixtureRepository,
  IProductRepository,
  FixtureConfig,
} from "@vst/vocabulary-types";
import { IPlacementModelRegistry, IPlacementModel } from "@vst/placement-core";
import { ProductInstanceGenerator } from "./ProductInstanceGenerator";
import { CorePerspectiveScaler } from "./CorePerspectiveScaler";
import { CoreZLayerManager } from "./CoreZLayerManager";
import { CoreProductPositioner } from "./CoreProductPositioner";
import { ShadowTypeDeterminer } from "./ShadowTypeDeterminer";
import { MaskRequiredChecker } from "./MaskRequiredChecker";
import { ValidationRulesProcessor } from "./ValidationRulesProcessor";
import { InstanceNormalizer } from "../expansion-logic";

/**
 * CORE LAYER PROCESSING - Stateless data preparation pipeline
 * Transforms semantic (L1-L3) data into render-ready instances (L4) WITHOUT actual rendering.
 * This layer is designed to be pure and stateless, focusing solely on data transformation.
 */
export class CoreLayerProcessor {
  private readonly registries: {
    fixtureRegistry: IFixtureRepository;
    placementModelRegistry: IPlacementModelRegistry;
    metadataStore: IProductRepository;
  };

  private readonly processors: Array<{
    process: (
      instance: RenderInstance,
      fixture: FixtureConfig,
      placementModel: IPlacementModel,
    ) => Promise<RenderInstance>;
  }>;
  private readonly normalizer: InstanceNormalizer;
  private readonly validator: ValidationRulesProcessor;

  constructor(
    fixtureRegistry: IFixtureRepository,
    placementModelRegistry: IPlacementModelRegistry,
    metadataStore: IProductRepository,
  ) {
    this.registries = {
      fixtureRegistry,
      placementModelRegistry,
      metadataStore,
    };

    // Instantiate the sequence of processors that transform the data.
    // Each processor takes an instance and returns a modified one.
    this.processors = [
      new CorePerspectiveScaler(),
      new CoreZLayerManager(),
      new CoreProductPositioner(),
      new ShadowTypeDeterminer(),
      new MaskRequiredChecker(),
    ];

    this.normalizer = new InstanceNormalizer();
    this.validator = new ValidationRulesProcessor();
  }

  /**
   * Main processing pipeline: L1-L3 Input → L4 Render-Ready Instances.
   * Orchestrates the transformation of raw planogram data into a format
   * suitable for the rendering layer.
   * @param planogramConfig - The raw planogram data.
   * @returns A promise that resolves to the processed planogram data, including render instances.
   */
  async processPlanogram(
    planogramConfig: PlanogramConfig,
  ): Promise<ProcessedPlanogram> {
    // Basic validation of input configuration
    if (
      !planogramConfig ||
      !planogramConfig.fixture ||
      !planogramConfig.products
    ) {
      throw new Error(
        "Invalid planogramConfig provided. Missing fixture or products.",
      );
    }

    // PHASE 1: Initial Data Fetching from Registries
    // Retrieve definitions needed for processing all products in this planogram.
    const fixtureDef = await this.registries.fixtureRegistry.getByType(
      planogramConfig.fixture.type,
    );
    const placementModel = this.registries.placementModelRegistry.get(
      planogramConfig.fixture.placementModel,
    );

    if (!fixtureDef) {
      throw new Error(
        `Fixture definition not found for type: ${planogramConfig.fixture.type}`,
      );
    }
    if (!placementModel) {
      throw new Error(
        `Placement model not found for type: ${planogramConfig.fixture.placementModel}`,
      );
    }

    // PHASE 2: Process each product through the pipeline
    const renderInstances: RenderInstance[] = [];
    const processingErrors: any[] = []; // Store errors encountered during processing

    const generator = new ProductInstanceGenerator();

    for (const product of planogramConfig.products) {
      const productId =
        product.id || `product_${Math.random().toString(36).substring(2, 9)}`;

      try {
        // Step 1: Generate initial template (Hydrate L1-L3 data)
        let template: RenderInstance = await generator.process(
          {
            id: productId,
            sku: product.sku,
            sourceData: product,
            fixture: fixtureDef,
            placementModelId: placementModel.id,
            registries: this.registries,
          } as any,
          fixtureDef,
          placementModel as any, // Cast to any to bypass strict behavioral checks in template generator
        );

        // Step 2: Expand template into multiple instances (Layer 3 expansion: Facings & Pyramids)
        const expandedInstances = this.normalizer.normalize(template);

        // Step 3: Process each expanded instance through the remaining pipeline (L4 preparation)
        for (let currentInstance of expandedInstances) {
          try {
            // Apply each remaining processor in sequence
            for (const processor of this.processors) {
              currentInstance = await processor.process(
                currentInstance,
                fixtureDef,
                placementModel as any,
              );
            }

            // PHASE 3: Validate the final prepared instance
            const validationResult = this.validator.validate(
              currentInstance,
              fixtureDef,
              placementModel,
            );
            if (validationResult.valid) {
              renderInstances.push(currentInstance);
            } else {
              console.warn(
                `Instance ${currentInstance.id} failed validation:`,
                validationResult.errors,
              );
              processingErrors.push({
                id: currentInstance.id,
                validationErrors: validationResult.errors,
              });
            }
          } catch (innerError: any) {
            console.error(
              `Error processing expanded instance ${currentInstance.id}:`,
              innerError.message,
            );
            processingErrors.push({
              id: currentInstance.id,
              error: innerError.message,
            });
          }
        }
      } catch (error: any) {
        console.error(
          `Error processing instance ${productId} (SKU: ${product.sku}):`,
          error.message,
        );
        processingErrors.push({ id: productId, error: error.message });
      }
    }

    // PHASE 4: Compile results and metadata
    const totalProducts = planogramConfig.products.length;
    const validInstancesCount = renderInstances.length;
    const invalidCount = totalProducts - validInstancesCount;

    return {
      renderInstances,
      fixture: fixtureDef,
      metadata: {
        totalInstances: totalProducts,
        validInstances: validInstancesCount,
        invalidCount: invalidCount,
        processingTime: Date.now(), // Timestamp of completion
        processingErrors: processingErrors,
      },
    };
  }
}
