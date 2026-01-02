/**
 * RENDER ENGINE
 * Viewport and context definitions for the drawing layer.
 */

import { Vector2, Vector3 } from "../core/geometry";
import { RenderInstance } from "./instance";
import { FixtureConfig } from "../planogram/config";

/**
 * Viewport
 * Defines the visible window into the 2D render space.
 */
export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
  dpi?: number;
}

export type RenderContextType = "canvas2d" | "webgl" | "threejs";

export interface RenderEngineConfig {
  width: number;
  height: number;
  dpi: number;
  clearColor?: string;
}

export interface RenderResult {
  drawCalls: number;
  success: boolean;
  visibleInstances: number;
  renderTime: number;
}

export type ProjectionType = "orthographic" | "perspective" | "top-down";

export interface RenderProjection {
  type: ProjectionType;
  /** Scale factor: How many pixels represent 1mm at zoom 1.0 */
  ppi: number;
  zoom: number;
  offset: Vector3; // Pan

  /** For 3D Contexts */
  camera?: {
    fov: number;
    near: number;
    far: number;
    position: Vector3;
    target: Vector3;
  };
}

export interface IVstRenderer {
  // Initialize canvas/scene
  initialize(el: HTMLElement, config: RenderEngineConfig): void;

  // The core loop: World Data -> Screen
  render(
    instances: RenderInstance[],
    fixture: FixtureConfig,
    projection: RenderProjection,
  ): void;

  // Coordinate conversion
  screenToWorld(point: Vector2): Vector3;
  worldToScreen(point: Vector3): Vector2;

  // Disposal
  dispose(): void;
}

/**
 * ProcessedPlanogram
 * The result of the entire processing pipeline.
 */
export interface ProcessedPlanogram {
  renderInstances: RenderInstance[];
  fixture: FixtureConfig;
  atlas?: any; // Generic atlas handle
  metadata: {
    totalInstances: number;
    validInstances: number;
    invalidCount: number;
    processingTime: number;
    processingErrors?: any[];
  };
}
