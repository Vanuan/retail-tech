import {
  PlanogramAction,
  PlanogramConfig,
  ProductMetadata,
  SemanticPosition,
  ValidationResult,
  ProcessedPlanogram,
  IPlanogramSnapshot,
  PlacementSuggestion,
  ShelfConfig,
  ShelfIndex,
  FixtureConfig,
  Millimeters,
} from "@vst/vocabulary-types";

import { PlanogramActions } from "@vst/vocabulary-actions";
import { ProductIntentBuilder } from "./ProductIntentBuilder";
import { PlanogramBuilderOptions } from "./types";
import { v4 as uuidv4 } from "uuid";

/**
 * PlanogramBuilder
 *
 * A headless, deterministic, fluent API for expressing retail intent.
 * It delegates "physics" (positioning, validation) to IRetailLogic and projection to ICoreProcessor.
 */
export class PlanogramBuilder {
  private actions: PlanogramAction[] = [];

  constructor(
    private readonly config: PlanogramConfig,
    private readonly metadata: Map<string, ProductMetadata>,
    private readonly options: PlanogramBuilderOptions,
  ) {}

  // ---------------- Intent ----------------

  /**
   * Starts an intent to add a product.
   * Returns a ProductIntentBuilder for chaining configuration.
   */
  addProduct(sku: string): ProductIntentBuilder {
    return new ProductIntentBuilder(this, sku);
  }

  /**
   * Records an intent to remove a product by ID.
   */
  removeProduct(productId: string): this {
    this.record(PlanogramActions.removeProduct(productId));
    return this;
  }

  /**
   * Records an intent to move a product to a new position.
   */
  moveProduct(productId: string, to: SemanticPosition): this {
    this.record(PlanogramActions.moveProduct({ productId, to }));
    return this;
  }

  /**
   * Records an intent to add a shelf to the fixture.
   * If partial config is provided, it calculates reasonable defaults for index and height
   * based on the current state of the planogram (including previously recorded actions).
   */
  addShelf(shelf?: Partial<ShelfConfig>): this {
    // Derive the latest configuration to find existing shelves
    const snapshot = this.options.processor.project(
      this.config,
      this.actions,
      this.metadata,
    );
    const existingShelves =
      (snapshot.config.fixture.config.shelves as ShelfConfig[]) || [];

    const maxIdx = existingShelves.reduce((m, s) => Math.max(m, s.index), -1);
    const maxH = existingShelves.reduce((m, s) => Math.max(m, s.baseHeight), 0);

    const fullShelf: ShelfConfig = {
      id: shelf?.id || uuidv4(),
      index: shelf?.index ?? ((maxIdx + 1) as ShelfIndex),
      baseHeight: shelf?.baseHeight ?? ((maxH + 300) as Millimeters),
    };

    this.record(PlanogramActions.addShelf(fullShelf));
    return this;
  }

  /**
   * Records an intent to remove a shelf by its index.
   */
  removeShelf(index: ShelfIndex): this {
    this.record(PlanogramActions.removeShelf(index));
    return this;
  }

  /**
   * Records an intent to update shelf properties.
   */
  updateShelf(index: ShelfIndex, updates: Partial<ShelfConfig>): this {
    this.record(PlanogramActions.updateShelf({ index, updates }));
    return this;
  }

  /**
   * Records an intent to update the global fixture configuration.
   */
  updateFixture(updates: Partial<FixtureConfig>): this {
    this.record(PlanogramActions.updateFixture(updates));
    return this;
  }

  // ---------------- Validation ----------------

  /**
   * Validates the current set of actions against the processor.
   */
  validate(): ValidationResult {
    // Note: CoreProcessor's validateIntent currently takes a single action.
    // We wrap our sequence in a BATCH for validation.
    return this.options.retailLogic.validateIntent(
      PlanogramActions.batch(this.actions),
      {
        config: this.config,
        metadata: this.metadata,
      },
    );
  }

  /**
   * Suggests a placement for a SKU based on the current configuration
   * and any actions already recorded.
   */
  suggestPlacement(input: {
    sku: string;
    preferredShelf?: ShelfIndex;
  }): PlacementSuggestion | null {
    return this.options.retailLogic.suggestPlacement({
      ...input,
      config: this.config,
      metadata: this.metadata,
      actions: this.actions,
    });
  }

  // ---------------- Output ----------------

  /**
   * Projects the accumulated intent into a final L4 state.
   * Throws if strict mode is enabled and intent is invalid.
   */
  build(): ProcessedPlanogram {
    if (this.options.strict) {
      const result = this.validate();
      if (!result.valid) {
        throw new Error(
          `Invalid planogram intent: ${result.errors.map((e) => e.message).join(", ")}`,
        );
      }
    }

    // project() returns an IPlanogramSnapshot which extends ProcessedPlanogram
    return this.options.processor.project(
      this.config,
      this.actions,
      this.metadata,
    );
  }

  /**
   * Returns a complete snapshot of the planogram, including the derived configuration.
   */
  snapshot(): IPlanogramSnapshot {
    return this.options.processor.project(
      this.config,
      this.actions,
      this.metadata,
    );
  }

  // ---------------- Internals ----------------

  /**
   * Records an action and optionally validates it immediately.
   * Primarily intended for use by internal intent builders.
   */
  record(action: PlanogramAction): void {
    if (this.options.strict) {
      const validation = this.options.retailLogic.validateIntent(action, {
        config: this.config, // Note: For true strict sequential validation, we might need a sliding context
        metadata: this.metadata,
      });

      if (!validation.valid) {
        throw new Error(
          `Invalid intent: ${validation.errors[0]?.message || "Unknown error"}`,
        );
      }
    }

    this.actions.push(action);
  }

  /**
   * Exposes the raw recorded actions.
   */
  getActions(): readonly PlanogramAction[] {
    return this.actions;
  }
}
