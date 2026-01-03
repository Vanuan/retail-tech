/**
 * RENDERER SUBSYSTEMS
 * Interfaces for the various components of the drawing engine.
 */

import { RenderInstance } from "./instance";
import { Viewport } from "./engine";
import { Vector2 } from "../core/geometry";
import { RenderCoordinates } from "../coordinates/render";

export interface IVisualOrchestration {
  zLayerManager: IRendererZLayerManager;
  productPositioner: IRendererProductPositioner;
  hitTester: IHitTester;
}

export interface IRendererZLayerManager {
  sortByZIndex(instances: RenderInstance[]): RenderInstance[];
  applyStackingContext(
    instances: RenderInstance[],
    viewport: Viewport,
  ): RenderInstance[];
}

export interface IRendererProductPositioner {
  applyTransforms(context: any, renderCoordinates: RenderCoordinates): void;
  resetTransforms(context: any): void;
}

export interface IHitTester {
  test(
    screenX: number,
    screenY: number,
    instances: RenderInstance[],
    viewport: Viewport,
  ): HitTestResult | null;
}

export interface HitTestResult {
  instance: RenderInstance;
  hitPoint: Vector2;
  screenPoint: Vector2;
}

export interface ISpriteExecution {
  spriteCache: any;
  productSprite: IRendererProductSprite;
  maskRenderer: IRendererMaskRenderer;
  shadowRenderer: IRendererShadowRenderer;
}

export interface IRendererProductSprite {
  setAtlas(atlas: any): void;
  render(
    context: any,
    instance: RenderInstance,
    viewport: Viewport,
  ): Promise<{ drawCalls: number; angle: number }>;
}

export interface IRendererMaskRenderer {
  apply(
    context: any,
    instance: RenderInstance,
    viewport: Viewport,
  ): Promise<void>;
}

export interface IRendererShadowRenderer {
  render(
    context: any,
    instance: RenderInstance,
    viewport: Viewport,
  ): Promise<void>;
}
