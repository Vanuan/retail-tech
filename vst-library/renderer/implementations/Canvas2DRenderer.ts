import {
  IVstRenderer,
  RenderEngineConfig,
  RenderProjection,
} from "../../types/rendering/engine";
import { RenderInstance } from "../../types/rendering/instance";
import { FixtureConfig } from "../../types/planogram/config";
import { Vector2, Vector3 } from "../../types/core/geometry";
import { Projection } from "../../Projection";
import { IBrowserAssetProvider } from "../../types/repositories/providers";
import { Pixels } from "../../types/core/units";
import { LabelUtils } from "./shared/LabelUtils";

/**
 * Canvas2DRenderer
 *
 * A high-performance 2D implementation of the VST Renderer using HTML5 Canvas.
 * Decouples rendering logic from React component state.
 */
export class Canvas2DRenderer implements IVstRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private assetProvider: IBrowserAssetProvider;
  private currentFixture: FixtureConfig | null = null;
  private currentProjection: RenderProjection | null = null;
  private selectedProductId: string | null = null;
  private hoveredInstanceId: string | null = null;
  private showPriceLabels: boolean = true;

  constructor(assetProvider: IBrowserAssetProvider) {
    this.assetProvider = assetProvider;
  }

  /**
   * Updates the selection and hover state for the renderer.
   * This logic is separate from the core render loop to allow for
   * independent UI state updates.
   */
  setSelection(productId: string | null, hoveredId: string | null) {
    this.selectedProductId = productId;
    this.hoveredInstanceId = hoveredId;
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

    // 1. Draw Fixture Background & Shelves
    this.drawFixture(this.ctx, fixture, projection);

    // 2. Draw Product Instances
    this.drawInstances(this.ctx, instances, fixture, projection);
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

  private drawFixture(
    ctx: CanvasRenderingContext2D,
    fixture: FixtureConfig,
    projection: RenderProjection,
  ) {
    const scale = projection.ppi * projection.zoom;
    const x = projection.offset.x;
    const y = projection.offset.y;
    const width = fixture.dimensions.width * scale;
    const height = fixture.dimensions.height * scale;
    const vProps = fixture.visualProperties;

    const assets = vProps?.assets || {};
    const getImage = (key: string) => {
      const url = (assets as any)[key];
      return url ? this.assetProvider.getLoadedImage(url) : null;
    };

    const backImg = getImage("back");
    const uprightImg = getImage("upright");
    const baseImg = getImage("base");
    const shelfSurfaceImg = getImage("shelfSurface");
    const priceRailImg = getImage("priceRail") || getImage("shelf");

    // 1. Draw Background
    if (backImg && backImg.complete) {
      for (let i = 0; i < height / (backImg.height * scale); i++) {
        ctx.drawImage(
          backImg,
          x,
          y + backImg.height * scale * i,
          width,
          backImg.height * scale,
        );
      }
    } else {
      ctx.fillStyle = "#18181b";
      ctx.fillRect(x, y, width, height);
    }

    // 2. Draw Uprights
    const uprightWidth = (vProps?.dimensions?.uprightWidth ?? 40) * scale;
    if (uprightImg && uprightImg.complete) {
      ctx.drawImage(uprightImg, x - uprightWidth, y, uprightWidth, height);
      ctx.drawImage(uprightImg, x + width, y, uprightWidth, height);
    } else {
      ctx.fillStyle = "#52525b";
      ctx.fillRect(x - uprightWidth, y, uprightWidth, height);
      ctx.fillRect(x + width, y, uprightWidth, height);
    }

    // 3. Draw Base
    // The base is rendered below the fixture dimensions, as the bottom shelf
    // is typically at world coordinate Y=0 (which projects to screen y + height).
    const baseHeight = (vProps?.dimensions?.baseHeight ?? 100) * scale;
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

    // 4. Draw Shelves
    const shelves = (fixture.config.shelves as any[]) || [];
    shelves.forEach((shelf) => {
      const worldY = shelf.baseHeight;
      const screenPos = Projection.project(
        { x: 0, y: worldY, z: 0 },
        fixture,
        projection,
      );

      // 1. Draw Shelf Surface (The horizontal part extending backwards)
      // We draw this slightly above the baseline to simulate depth
      const surfaceHeight =
        (vProps?.dimensions?.shelfSurfaceHeight ?? 40) * scale;
      if (shelfSurfaceImg && shelfSurfaceImg.complete) {
        ctx.drawImage(
          shelfSurfaceImg,
          x,
          screenPos.y - surfaceHeight,
          width,
          surfaceHeight,
        );
      } else {
        const surfaceGradient = ctx.createLinearGradient(
          x,
          screenPos.y - surfaceHeight,
          x,
          screenPos.y,
        );
        surfaceGradient.addColorStop(0, "#3f3f46");
        surfaceGradient.addColorStop(1, "#27272a");
        ctx.fillStyle = surfaceGradient;
        ctx.fillRect(x, screenPos.y - surfaceHeight, width, surfaceHeight);
      }

      // 2. Draw Price Rail (The front vertical edge)
      const railHeight = (vProps?.dimensions?.priceRailHeight ?? 35) * scale;
      if (priceRailImg && priceRailImg.complete) {
        ctx.drawImage(priceRailImg, x, screenPos.y, width, railHeight);
      } else {
        ctx.fillStyle = "#18181b";
        ctx.fillRect(x, screenPos.y, width, railHeight);

        // Subtle highlight on the top edge of the rail
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(x, screenPos.y, width, 2);
      }
    });
  }

  private drawInstances(
    ctx: CanvasRenderingContext2D,
    instances: RenderInstance[],
    fixture: FixtureConfig,
    projection: RenderProjection,
  ) {
    instances.forEach((instance) => {
      // 1. Project World Position to Screen Space
      const pos = Projection.project(
        instance.worldPosition,
        fixture,
        projection,
      );

      // 2. Scale Dimensions
      // Note: We apply depthRatio here for 2D perspective simulation
      const renderWidth = Projection.scale(
        instance.worldDimensions.width * instance.depthRatio,
        projection,
      );
      const renderHeight = Projection.scale(
        instance.worldDimensions.height * instance.depthRatio,
        projection,
      );

      // 3. Calculate Draw Position based on Anchor (Screen Space)
      // Most products have anchor { x: 0.5, y: 1 } (bottom-center)
      const drawX = pos.x - instance.anchorPoint.x * renderWidth;
      const drawY = pos.y - instance.anchorPoint.y * renderHeight;

      // 4. Store Render Coordinates back in the instance (L5 Data)
      // This allows the Controller to perform hit-testing or other interactions
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

      instance.renderBounds = {
        x: drawX as Pixels,
        y: drawY as Pixels,
        width: renderWidth as Pixels,
        height: renderHeight as Pixels,
        center: {
          x: (drawX + renderWidth / 2) as Pixels,
          y: (drawY + renderHeight / 2) as Pixels,
        },
      };

      // 5. Draw Sprite
      const spriteUrl = instance.assets.spriteVariants[0]?.url;
      const img = spriteUrl
        ? this.assetProvider.getLoadedImage(spriteUrl)
        : null;

      if (img && img.complete) {
        // Simple shadow for front-row items
        if (instance.visualProperties.isFrontRow) {
          ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
          ctx.shadowBlur = 8;
          ctx.shadowOffsetY = 4;
        }

        ctx.drawImage(img, drawX, drawY, renderWidth, renderHeight);

        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      } else {
        // Placeholder
        ctx.fillStyle = instance.visualProperties.isFrontRow
          ? "#cccccc"
          : "#999999";
        ctx.fillRect(drawX, drawY, renderWidth, renderHeight);
      }

      // Draw Depth overlay for back rows
      if (!instance.visualProperties.isFrontRow) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        ctx.fillRect(drawX, drawY, renderWidth, renderHeight);
      }
    });

    // Draw Price Labels
    if (this.showPriceLabels && this.currentFixture) {
      LabelUtils.drawPriceLabels(
        ctx,
        instances,
        this.currentFixture,
        projection,
      );
    }

    // Draw Labels & Group Highlights
    this.drawOverlays(ctx, instances, projection);
  }

  private drawOverlays(
    ctx: CanvasRenderingContext2D,
    instances: RenderInstance[],
    projection: RenderProjection,
  ) {
    const productGroups = new Map<string, RenderInstance[]>();
    instances.forEach((inst) => {
      const pid = inst.sourceData.id;
      if (!productGroups.has(pid)) productGroups.set(pid, []);
      productGroups.get(pid)!.push(inst);
    });

    productGroups.forEach((groupInstances, productId) => {
      if (groupInstances.length === 0) return;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      groupInstances.forEach((inst) => {
        if (!inst.renderCoordinates) return;
        minX = Math.min(minX, inst.renderCoordinates.x);
        minY = Math.min(minY, inst.renderCoordinates.y);
        maxX = Math.max(
          maxX,
          inst.renderCoordinates.x + inst.renderCoordinates.width,
        );
        maxY = Math.max(
          maxY,
          inst.renderCoordinates.y + inst.renderCoordinates.height,
        );
      });

      if (minX === Infinity) return;

      const groupX = minX;
      const groupY = minY;
      const groupWidth = maxX - minX;
      const groupHeight = maxY - minY;

      const first = groupInstances[0];

      const isSelected = this.selectedProductId === productId;
      const isHovered = groupInstances.some(
        (inst) => inst.id === this.hoveredInstanceId,
      );

      // 1. Draw Selection/Hover Border
      if (isSelected || isHovered) {
        ctx.strokeStyle = isSelected ? "#3b82f6" : "#6b7280";
        ctx.lineWidth = 3;
        ctx.strokeRect(groupX - 2, groupY - 2, groupWidth + 4, groupHeight + 4);
      }
    });
  }

  screenToWorld(point: Vector2): Vector3 {
    if (!this.currentFixture || !this.currentProjection) {
      return { x: 0, y: 0, z: 0 };
    }
    return Projection.unproject(
      point,
      this.currentFixture,
      this.currentProjection,
    );
  }

  worldToScreen(point: Vector3): Vector2 {
    if (!this.currentFixture || !this.currentProjection) {
      return { x: 0, y: 0 };
    }
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
