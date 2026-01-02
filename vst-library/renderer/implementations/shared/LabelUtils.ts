import { RenderInstance } from "../../../types/rendering/instance";
import { FixtureConfig } from "../../../types/planogram/config";
import { RenderProjection } from "../../../types/rendering/engine";
import { Projection } from "../../Projection";

/**
 * Shared utility for rendering branded price labels across different renderers.
 */
export class LabelUtils {
  /**
   * Draws a high-fidelity branded price label (Tesco style) that includes
   * both the product name and the unit price.
   */
  static drawBrandedPriceLabel(
    ctx: CanvasRenderingContext2D,
    instance: RenderInstance,
    fixture: FixtureConfig,
    productX: number,
    shelfY: number,
    productWidth: number,
    scale: number,
    zoom: number,
    ppi: number,
  ) {
    const vProps = fixture.visualProperties;
    const labelHeight = (vProps?.dimensions?.priceLabelHeight ?? 28) * scale;
    const railHeight = (vProps?.dimensions?.priceRailHeight ?? 35) * scale;

    // Center the label vertically on the price rail
    const labelY = shelfY + (railHeight - labelHeight) / 2;
    const labelPadding = 4 * scale;

    const price =
      instance.sourceData.pricing?.unitPrice ||
      instance.metadata.pricing?.unitPrice ||
      0;
    const priceText = `£${price.toFixed(2)}`;
    const nameText = instance.metadata.name.toUpperCase();

    // Font scaling relative to PPI to keep text readable
    const baseFontSize = 13 * (scale / ppi);
    const smallFontSize = 7 * (scale / ppi);

    ctx.font = `bold ${baseFontSize}px sans-serif`;
    const priceWidth = ctx.measureText(priceText).width;

    ctx.font = `${smallFontSize}px sans-serif`;
    const nameWidth = ctx.measureText(nameText).width;

    const contentWidth = Math.max(priceWidth, nameWidth);
    const labelWidth = Math.max(contentWidth, 45 * scale) + labelPadding * 3;
    const labelX = productX + (productWidth - labelWidth) / 2;

    // 1. Draw Label Background & Border
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(labelX, labelY, labelWidth, labelHeight);

    // Top branded red stripe
    ctx.fillStyle = "#ee1c2e";
    ctx.fillRect(labelX, labelY, labelWidth, 3 * scale);

    ctx.strokeStyle = "#e5e5e5";
    ctx.lineWidth = 1;
    ctx.strokeRect(labelX, labelY, labelWidth, labelHeight);

    // 2. Draw Product Name (Small, top)
    ctx.fillStyle = "#4b5563"; // Gray 600
    ctx.font = `bold ${smallFontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(
      nameText,
      labelX + labelWidth / 2,
      labelY + 11 * scale,
      labelWidth - labelPadding, // Truncate if too long
    );

    // 3. Draw Price (Large, bottom)
    ctx.fillStyle = "#18181b"; // Zinc 900
    ctx.font = `bold ${baseFontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(
      priceText,
      labelX + labelWidth / 2,
      labelY + labelHeight - 5 * scale,
    );
  }

  /**
   * Renders labels for a collection of instances, grouping them by product ID
   * and shelf index to ensure only one label is drawn per facing set.
   */
  static drawPriceLabels(
    ctx: CanvasRenderingContext2D,
    instances: RenderInstance[],
    fixture: FixtureConfig,
    projection: RenderProjection,
  ) {
    const frontRowGroups = new Map<string, RenderInstance[]>();

    instances.forEach((inst) => {
      if (!inst.visualProperties.isFrontRow) return;

      const shelfIndex = (inst.semanticCoordinates as any).shelfIndex ?? 0;
      const key = `${inst.sourceData.id}-${shelfIndex}`;
      if (!frontRowGroups.has(key)) {
        frontRowGroups.set(key, []);
      }
      frontRowGroups.get(key)!.push(inst);
    });

    const scale = projection.ppi * projection.zoom;

    frontRowGroups.forEach((groupInstances) => {
      if (groupInstances.length === 0) return;

      let minX = Infinity;
      let maxX = -Infinity;
      let shelfY = 0;

      groupInstances.forEach((inst) => {
        if (!inst.renderCoordinates) return;
        minX = Math.min(minX, inst.renderCoordinates.x);
        maxX = Math.max(
          maxX,
          inst.renderCoordinates.x + inst.renderCoordinates.width,
        );

        const pos = Projection.project(inst.worldPosition, fixture, projection);
        shelfY = pos.y;
      });

      if (minX === Infinity) return;

      const groupWidth = maxX - minX;
      const first = groupInstances[0];

      this.drawBrandedPriceLabel(
        ctx,
        first,
        fixture,
        minX,
        shelfY,
        groupWidth,
        scale,
        projection.zoom,
        projection.ppi,
      );
    });
  }
}
