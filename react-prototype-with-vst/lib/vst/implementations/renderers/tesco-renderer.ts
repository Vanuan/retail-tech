import {
  IVstRenderer,
  RenderEngineConfig,
  RenderProjection,
} from "../../types/rendering/engine";
import { RenderInstance } from "../../types/rendering/instance";
import { FixtureConfig } from "../../types/planogram/config";
import { Vector2, Vector3 } from "../../types/core/geometry";
import { Projection } from "../projection";
import { IBrowserAssetProvider } from "../../types/repositories/providers";
import { Pixels } from "../../types/core/units";
import { LabelUtils } from "./shared/label-utils";

/**
 * TescoRenderer
 *
 * A specialized implementation of IVstRenderer with the "Taste the Difference"
 * aesthetic. Features branded back panels, specific shelf styling, and
 * high-fidelity price labels.
 */
export class TescoRenderer implements IVstRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private assetProvider: IBrowserAssetProvider;
  private currentFixture: FixtureConfig | null = null;
  private currentProjection: RenderProjection | null = null;
  private selectedProductId: string | null = null;
  private hoveredInstanceId: string | null = null;
  private selectedShelfIndex: number | null = null;
  private showPriceLabels: boolean = true;

  constructor(assetProvider: IBrowserAssetProvider) {
    this.assetProvider = assetProvider;
  }

  setSelection(productId: string | null, hoveredId: string | null) {
    this.selectedProductId = productId;
    this.hoveredInstanceId = hoveredId;
  }

  setSelectedShelf(index: number | null) {
    this.selectedShelfIndex = index;
  }

  setShowPriceLabels(show: boolean) {
    this.showPriceLabels = show;
  }

  initialize(el: HTMLElement, config: RenderEngineConfig): void {
    if (el instanceof HTMLCanvasElement) {
      this.canvas = el;
    } else {
      const canvas = document.createElement("canvas");
      el.appendChild(canvas);
      this.canvas = canvas;
    }

    this.ctx = this.canvas.getContext("2d");
    this.updateSize(config.width, config.height, config.dpi);
  }

  private updateSize(width: number, height: number, dpi: number) {
    if (!this.canvas) return;
    this.canvas.width = width * dpi;
    this.canvas.height = height * dpi;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    if (this.ctx) {
      this.ctx.resetTransform();
      this.ctx.scale(dpi, dpi);
    }
  }

  render(
    instances: RenderInstance[],
    fixture: FixtureConfig,
    projection: RenderProjection,
  ): void {
    if (!this.ctx || !this.canvas) return;

    this.currentFixture = fixture;
    this.currentProjection = projection;

    const { width, height } = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, width, height);

    // 0. Draw Environment Background
    this.drawEnvironment(this.ctx, width, height, projection);

    // 1. Draw "Taste the Difference" Fixture
    this.drawBrandedFixture(this.ctx, fixture, projection, instances);

    // 2. Draw Products
    this.drawInstances(this.ctx, instances, fixture, projection);
  }

  private drawBrandedFixture(
    ctx: CanvasRenderingContext2D,
    fixture: FixtureConfig,
    projection: RenderProjection,
    instances: RenderInstance[],
  ) {
    const scale = projection.ppi * projection.zoom;
    const x = projection.offset.x;
    const y = projection.offset.y;
    const width = fixture.dimensions.width * scale;
    const height = fixture.dimensions.height * scale;
    const vProps = fixture.visualProperties;
    const uprightWidth = (vProps?.dimensions?.uprightWidth ?? 45) * scale;

    // --- Draw Uprights ---
    const uprightGradient = ctx.createLinearGradient(x - uprightWidth, y, x, y);
    uprightGradient.addColorStop(0, "#f5f5f5");
    uprightGradient.addColorStop(0.5, "#ffffff");
    uprightGradient.addColorStop(1, "#fafafa");

    ctx.fillStyle = uprightGradient;
    ctx.fillRect(x - uprightWidth, y, uprightWidth, height);
    ctx.fillRect(x + width, y, uprightWidth, height);

    // Adjustment holes
    ctx.fillStyle = "#a1a1aa";
    const holeWidth = 8 * scale;
    const holeHeight = 20 * scale;
    const holeSpacing = 40 * scale;
    for (
      let hy = y + 50 * scale;
      hy < y + height - 50 * scale;
      hy += holeSpacing
    ) {
      ctx.fillRect(
        x - uprightWidth / 2 - holeWidth / 2,
        hy,
        holeWidth,
        holeHeight,
      );
      ctx.fillRect(
        x + width + uprightWidth / 2 - holeWidth / 2,
        hy,
        holeWidth,
        holeHeight,
      );
    }

    // --- Draw Branded Back Panel ---
    const bgGradient = ctx.createLinearGradient(x, y, x, y + height);
    bgGradient.addColorStop(0, "#3d1e5f");
    bgGradient.addColorStop(0.5, "#2d1547");
    bgGradient.addColorStop(1, "#3d1e5f");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(x, y, width, height);

    // Header section
    const headerHeight = (vProps?.dimensions?.headerHeight ?? 120) * scale;
    const headerGradient = ctx.createLinearGradient(x, y, x, y + headerHeight);
    headerGradient.addColorStop(0, "#4a2570");
    headerGradient.addColorStop(1, "#3d1e5f");
    ctx.fillStyle = headerGradient;
    ctx.fillRect(x, y, width, headerHeight);

    // Decorative dots
    ctx.fillStyle = "#d4af37";
    const dotSize = 8 * scale;
    for (
      let dx = x + 40 * scale;
      dx < x + width - 40 * scale;
      dx += 35 * scale
    ) {
      ctx.beginPath();
      ctx.arc(dx, y + 30 * scale, dotSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Brand text
    ctx.fillStyle = "#d4af37";
    ctx.font = `italic ${32 * projection.zoom}px serif`;
    ctx.textAlign = "center";
    ctx.fillText("taste", x + width / 2, y + 70 * scale);
    ctx.font = `bold ${16 * projection.zoom}px sans-serif`;
    ctx.fillText("THE DIFFERENCE", x + width / 2, y + 95 * scale);

    // Tesco Logo
    ctx.fillStyle = "#ee1c2e";
    ctx.fillRect(
      x + width - 80 * scale,
      y + 10 * scale,
      70 * scale,
      50 * scale,
    );
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${20 * projection.zoom}px sans-serif`;
    ctx.fillText("Tesco", x + width - uprightWidth, y + 40 * scale);

    const assets = vProps?.assets || {};

    // --- Draw Base ---
    const baseHeight = (vProps?.dimensions?.baseHeight ?? 100) * scale;
    const baseImg = assets.base
      ? this.assetProvider.getLoadedImage(assets.base)
      : null;

    if (baseImg && baseImg.complete) {
      ctx.drawImage(
        baseImg,
        x - uprightWidth,
        y + height,
        width + uprightWidth * 2,
        baseHeight,
      );
    } else {
      ctx.fillStyle = "#27272a";
      ctx.fillRect(
        x - uprightWidth,
        y + height,
        width + uprightWidth * 2,
        baseHeight,
      );
    }

    // --- Draw Shelves ---
    const shelves = (fixture.config.shelves as any[]) || [];
    const shelfSurfaceImg = assets.shelfSurface
      ? this.assetProvider.getLoadedImage(assets.shelfSurface)
      : null;
    const priceRailImg = assets.priceRail
      ? this.assetProvider.getLoadedImage(assets.priceRail)
      : assets.shelf
        ? this.assetProvider.getLoadedImage(assets.shelf)
        : null;

    shelves.forEach((shelf) => {
      const worldY = shelf.baseHeight;
      const screenPos = Projection.project(
        { x: 0, y: worldY, z: 0 },
        fixture,
        projection,
      );

      const shelfY = screenPos.y;
      const isSelected = this.selectedShelfIndex === shelf.index;

      // Selection highlight
      if (isSelected) {
        ctx.fillStyle = "rgba(212, 175, 55, 0.15)";
        ctx.fillRect(x - 10, shelfY - 50, width + 20, 100);
      }

      // --- 1. Draw Shelf Surface (Perspective Background) ---
      const surfaceHeight =
        (vProps?.dimensions?.shelfSurfaceHeight ?? 40) * scale;
      if (shelfSurfaceImg && shelfSurfaceImg.complete) {
        ctx.drawImage(
          shelfSurfaceImg,
          x,
          shelfY - surfaceHeight,
          width,
          surfaceHeight,
        );
      } else {
        const shelfGradient = ctx.createLinearGradient(
          x,
          shelfY - surfaceHeight,
          x,
          shelfY,
        );
        shelfGradient.addColorStop(0, "#fafafa");
        shelfGradient.addColorStop(0.5, "#ffffff");
        shelfGradient.addColorStop(1, "#f5f5f5");
        ctx.fillStyle = shelfGradient;
        ctx.fillRect(x, shelfY - surfaceHeight, width, surfaceHeight);

        // Edge highlight for procedural surface
        ctx.fillStyle = "#d4d4d8";
        ctx.fillRect(x, shelfY - surfaceHeight, width, 2);
      }

      // --- 2. Draw Price Rail (Front Edge) ---
      const railHeight = (vProps?.dimensions?.priceRailHeight ?? 35) * scale;
      if (priceRailImg && priceRailImg.complete) {
        ctx.drawImage(priceRailImg, x, shelfY, width, railHeight);
      } else {
        ctx.fillStyle = "#18181b";
        ctx.fillRect(x, shelfY, width, railHeight);

        // Branded decorative rail line if procedural
        ctx.fillStyle = "#d4af37";
        ctx.fillRect(x, shelfY, width, 2);
      }

      // --- Space usage indicator ---
      const shelfInstances = instances.filter(
        (inst) =>
          inst.semanticCoordinates.model === "shelf-surface" &&
          inst.semanticCoordinates.shelfIndex === shelf.index,
      );
      let shelfSpaceUsed = 0;
      shelfInstances.forEach((inst) => {
        const rightEdge =
          inst.worldPosition.x +
          inst.worldDimensions.width * (1 - inst.anchorPoint.x);
        shelfSpaceUsed = Math.max(shelfSpaceUsed, rightEdge);
      });

      const usedWidth = (shelfSpaceUsed / fixture.dimensions.width) * width;
      if (usedWidth > 0) {
        ctx.fillStyle = "rgba(212, 175, 55, 0.2)";
        ctx.fillRect(x, shelfY - 15, usedWidth, 30);

        const usagePercent = Math.round(
          (shelfSpaceUsed / fixture.dimensions.width) * 100,
        );
        ctx.fillStyle = "#d4af37";
        ctx.font = `bold ${11 * projection.zoom}px sans-serif`;
        ctx.textAlign = "left";
        ctx.fillText(`${usagePercent}%`, x + 5, shelfY + 4);
      }
    });

    // Outer Border
    ctx.strokeStyle = "#d4d4d8";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - uprightWidth, y, width + uprightWidth * 2, height);
  }

  /**
   * Draws a pleasant environment background including floor and horizon.
   */
  private drawEnvironment(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    projection: RenderProjection,
  ) {
    // Soft store background gradient (Wall)
    const wallGradient = ctx.createLinearGradient(0, 0, 0, height);
    wallGradient.addColorStop(0, "#f8fafc"); // Slate 50
    wallGradient.addColorStop(0.7, "#f1f5f9"); // Slate 100
    wallGradient.addColorStop(1, "#e2e8f0"); // Slate 200
    ctx.fillStyle = wallGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw a subtle floor/ground plane
    const fixtureHeightPx =
      (this.currentFixture?.dimensions.height || 0) *
      projection.ppi *
      projection.zoom;
    const floorY = projection.offset.y + fixtureHeightPx;

    if (floorY < height) {
      // Floor color
      ctx.fillStyle = "#cbd5e1"; // Slate 300
      ctx.fillRect(0, floorY, width, height - floorY);

      // Simple perspective floor lines for depth
      ctx.strokeStyle = "rgba(0,0,0,0.03)";
      ctx.lineWidth = 1;
      const spacing = 120 * projection.zoom;
      for (let tx = -width; tx < width * 2; tx += spacing) {
        ctx.beginPath();
        ctx.moveTo(tx, floorY);
        ctx.lineTo(tx - 300 * projection.zoom, height);
        ctx.stroke();
      }

      // Horizon line shadow/transition
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      ctx.fillRect(0, floorY, width, 6);

      ctx.strokeStyle = "rgba(0,0,0,0.1)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, floorY);
      ctx.lineTo(width, floorY);
      ctx.stroke();
    }
  }

  private drawInstances(
    ctx: CanvasRenderingContext2D,
    instances: RenderInstance[],
    fixture: FixtureConfig,
    projection: RenderProjection,
  ) {
    instances.forEach((instance) => {
      const pos = Projection.project(
        instance.worldPosition,
        fixture,
        projection,
      );
      const renderWidth = Projection.scale(
        instance.worldDimensions.width * instance.depthRatio,
        projection,
      );
      const renderHeight = Projection.scale(
        instance.worldDimensions.height * instance.depthRatio,
        projection,
      );

      const drawX = pos.x - instance.anchorPoint.x * renderWidth;
      const drawY = pos.y - instance.anchorPoint.y * renderHeight;

      // Update Render Coordinates for interaction
      instance.renderCoordinates = {
        x: drawX as Pixels,
        y: drawY as Pixels,
        width: renderWidth as Pixels,
        height: renderHeight as Pixels,
        rotation: 0 as any,
        scale: instance.depthRatio,
        anchorPoint: instance.anchorPoint,
        baseline: { x: 0, y: 0 },
      };

      // Draw Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.fillRect(drawX + 3, drawY + 3, renderWidth, renderHeight);

      // Draw Image or Placeholder
      const spriteUrl = instance.assets.spriteVariants[0]?.url;
      const img = spriteUrl
        ? this.assetProvider.getLoadedImage(spriteUrl)
        : null;

      if (img && img.complete) {
        ctx.drawImage(img, drawX, drawY, renderWidth, renderHeight);
      } else {
        ctx.fillStyle =
          instance.metadata.visualProperties.materials?.emissiveColor ||
          "#7f1d1d";
        ctx.fillRect(drawX, drawY, renderWidth, renderHeight);

        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.fillRect(drawX, drawY, renderWidth, renderHeight * 0.3);

        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${11 * projection.zoom}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(
          instance.metadata.name,
          drawX + renderWidth / 2,
          drawY + renderHeight / 2,
        );
      }

      // Draw Selection
      if (this.selectedProductId === instance.sourceData.id) {
        ctx.strokeStyle = "#d4af37";
        ctx.lineWidth = 3;
        ctx.strokeRect(drawX - 2, drawY - 2, renderWidth + 4, renderHeight + 4);
      }
    });

    if (this.showPriceLabels && this.currentFixture) {
      LabelUtils.drawPriceLabels(
        ctx,
        instances,
        this.currentFixture,
        projection,
      );
    }
  }

  screenToWorld(point: Vector2): Vector3 {
    if (!this.currentFixture || !this.currentProjection)
      return { x: 0, y: 0, z: 0 };
    return Projection.unproject(
      point,
      this.currentFixture,
      this.currentProjection,
    );
  }

  worldToScreen(point: Vector3): Vector2 {
    if (!this.currentFixture || !this.currentProjection) return { x: 0, y: 0 };
    return Projection.project(
      point,
      this.currentFixture,
      this.currentProjection,
    );
  }

  dispose(): void {
    this.canvas = null;
    this.ctx = null;
    this.currentFixture = null;
    this.currentProjection = null;
  }
}
