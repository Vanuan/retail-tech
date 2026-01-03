import {
  RenderInstance,
  ShadowProperties,
  FixtureConfig,
} from "@vst/vocabulary-types";
import { isShelfSurfacePosition } from "@vst/vocabulary-logic";
import { IPlacementModel } from "@vst/placement-core";

/**
 * SHADOW TYPE DETERMINER
 * Determines shadow needs based on product and fixture type.
 * Shadows add depth and realism to the 2D/2.5D visual representation.
 */
export class ShadowTypeDeterminer {
  /**
   * Processes the instance to determine its shadow properties.
   */
  async process(
    instance: RenderInstance,
    fixture: FixtureConfig,
    _placementModel: IPlacementModel,
  ): Promise<RenderInstance> {
    const shadowConfig = this.determineShadowConfig(fixture);
    const needsShadow = this.needsShadow(instance, fixture);

    return {
      ...instance,
      shadowProperties: {
        enabled: shadowConfig.enabled && needsShadow,
        type: shadowConfig.type,
        intensity: shadowConfig.intensity,
        offset: shadowConfig.offset,
        blur: shadowConfig.blur,
        color: shadowConfig.color,
        needsShadow: needsShadow,
      },
    };
  }

  /**
   * Determines the shadow configuration based on the fixture type and metadata.
   */
  private determineShadowConfig(
    fixture: FixtureConfig,
  ): Omit<ShadowProperties, "needsShadow"> {
    const fixtureType = fixture.type;

    // Default configurations based on fixture context
    const configs: Record<string, Omit<ShadowProperties, "needsShadow">> = {
      shelf: {
        enabled: true,
        type: "drop",
        intensity: 0.7,
        offset: { x: 0, y: 4 },
        blur: 8,
        color: "rgba(0, 0, 0, 0.3)",
      },
      pegboard: {
        enabled: true,
        type: "contact",
        intensity: 0.5,
        offset: { x: 0, y: 2 },
        blur: 4,
        color: "rgba(0, 0, 0, 0.2)",
      },
      refrigerated: {
        enabled: true,
        type: "frost",
        intensity: 0.6,
        offset: { x: 0, y: 6 },
        blur: 12,
        color: "rgba(0, 0, 0, 0.25)",
      },
    };

    return configs[fixtureType] || configs.shelf;
  }

  /**
   * Logic to determine if a product should cast a shadow.
   */
  private needsShadow(
    instance: RenderInstance,
    fixture: FixtureConfig,
  ): boolean {
    const semanticPos = instance.semanticCoordinates;
    let shelfIndex = 0;

    if (isShelfSurfacePosition(semanticPos)) {
      shelfIndex = semanticPos.shelfIndex;
    }

    // Products on the bottom shelf of a floor-standing unit might not cast shadows on the floor
    if (shelfIndex === 0 && fixture.type === "shelf") {
      return false;
    }

    // Hanging products on pegboards always benefit from a slight contact shadow
    if (fixture.type === "pegboard") {
      return true;
    }

    // Default: products cast shadows
    return true;
  }
}
