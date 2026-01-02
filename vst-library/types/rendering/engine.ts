/**
 * RENDER ENGINE
 * Viewport and context definitions for the drawing layer.
 */

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
