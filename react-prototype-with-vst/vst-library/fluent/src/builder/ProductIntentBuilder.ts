import {
  SemanticPosition,
  FacingConfig,
  FacingCount,
} from "@vst/vocabulary-types";
import { PlanogramActions } from "@vst/vocabulary-actions";
import { PlanogramBuilder } from "./PlanogramBuilder";
import { v4 as uuidv4 } from "uuid";

/**
 * ProductIntentBuilder
 *
 * A convenience wrapper for chaining the configuration of a product addition.
 * It accumulates intent properties and flattens them into actions on commit().
 */
export class ProductIntentBuilder {
  private id: string = uuidv4();
  private facings?: FacingConfig;
  private position?: SemanticPosition;

  constructor(
    private readonly builder: PlanogramBuilder,
    private readonly sku: string,
  ) {}

  /**
   * Sets the facings for the product being added.
   */
  withFacings(facings: FacingConfig): this {
    this.facings = facings;
    return this;
  }

  /**
   * Sets the semantic position for the product being added.
   */
  at(position: SemanticPosition): this {
    this.position = position;
    return this;
  }

  /**
   * Sets a specific ID for the product. If not called, a UUID is generated.
   */
  withId(id: string): this {
    this.id = id;
    return this;
  }

  /**
   * Flattens the accumulated intent into PlanogramActions and records them in the builder.
   * Returns the parent PlanogramBuilder for further chaining.
   */
  commit(): PlanogramBuilder {
    let targetPosition = this.position;

    if (!targetPosition) {
      const suggestion = this.builder.suggestPlacement({ sku: this.sku });
      if (suggestion) {
        targetPosition = suggestion.position;
      }
    }

    const addAction = PlanogramActions.addProduct({
      id: this.id,
      sku: this.sku,
      position: targetPosition || ({} as SemanticPosition),
      facings: this.facings || {
        horizontal: 1 as FacingCount,
        vertical: 1 as FacingCount,
      },
    });

    this.builder.record(addAction);

    return this.builder;
  }
}
