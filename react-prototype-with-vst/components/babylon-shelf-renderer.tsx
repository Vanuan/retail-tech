"use client";

import React, { useEffect, useRef, useContext, useMemo } from "react";
import * as BABYLON from "@babylonjs/core";
import { usePlanogramData } from "@/lib/planogram-data-context";
import { PlanogramEditorContext } from "@/lib/planogram-editor-context";
import { BabylonRenderer } from "@/lib/vst/implementations/renderers/babylon-renderer";
import { dal } from "@/lib/vst/implementations/repositories/data-access";
import {
  PlanogramConfig,
  RenderInstance,
  IAssetProvider as IBrowserAssetProvider,
} from "@vst/vocabulary-types";

interface BabylonShelfRendererProps {
  /** Optional override for config, otherwise uses context */
  config?: PlanogramConfig;
  /** Optional override for instances, otherwise uses context */
  renderInstances?: RenderInstance[];
  /** Callback when a product is clicked */
  onProductClick?: (
    productId: string,
    productName: string,
    instanceId?: string,
  ) => void;
  /** Callback when a product is hovered */
  onProductHover?: (instanceId: string | null) => void;
  /** Optional selection override */
  selectedProductId?: string;
  /** Optional instance selection override */
  selectedInstanceIds?: string[];
  /** Optional hovered instance override */
  hoveredInstanceId?: string | null;
  className?: string;
}

/**
 * BabylonShelfRenderer
 *
 * A high-fidelity 3D renderer for planograms using Babylon.js.
 * Refactored to use the BabylonRenderer implementation class and integrate with
 * the Planogram Data and Editor contexts for a seamless experience.
 */
export function BabylonShelfRenderer({
  config: propsConfig,
  renderInstances: propsInstances,
  onProductClick,
  onProductHover,
  selectedProductId: propsSelectedId,
  selectedInstanceIds: propsSelectedInstanceIds,
  hoveredInstanceId: propsHoveredId,
  className = "",
}: BabylonShelfRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<BabylonRenderer | null>(null);
  const onProductClickRef = useRef(onProductClick);
  const lastClickTimeRef = useRef(0);
  const assetProvider = dal.assets as IBrowserAssetProvider;

  // Context Integration
  const {
    config: contextConfig,
    renderInstances: contextInstances,
    metadata: productMetadataMap,
  } = usePlanogramData();

  const editorContext = useContext(PlanogramEditorContext);

  const config = propsConfig || contextConfig;
  const renderInstances = propsInstances || contextInstances;
  const selectedProductId = propsSelectedId || editorContext?.selectedProductId;
  const selectedInstanceIds = propsSelectedInstanceIds || [];
  const hoveredInstanceId = propsHoveredId;

  const projection = useMemo(
    () => ({
      type: "perspective" as const,
      ppi: 1,
      zoom: 1,
      offset: { x: 0, y: 0, z: 0 },
    }),
    [],
  );

  useEffect(() => {
    onProductClickRef.current = onProductClick;
  }, [onProductClick]);

  // Initialize Renderer Instance
  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new BabylonRenderer(assetProvider);
    renderer.initialize(canvasRef.current, {
      width: canvasRef.current.clientWidth,
      height: canvasRef.current.clientHeight,
      dpi: window.devicePixelRatio,
    });
    rendererRef.current = renderer;

    // Hit Testing & Interaction Logic
    const handlePointerDown = (evt: PointerEvent) => {
      const now = Date.now();
      if (now - lastClickTimeRef.current < 300) return;
      lastClickTimeRef.current = now;

      if (!rendererRef.current) return;

      // Accessing internal scene for picking logic
      // In a more mature implementation, this would be exposed via a pick() method on BabylonRenderer
      const scene = (rendererRef.current as any).scene as BABYLON.Scene;
      if (!scene) return;

      const pickResult = scene.pick(evt.offsetX, evt.offsetY);
      if (
        pickResult.hit &&
        pickResult.pickedMesh &&
        pickResult.pickedMesh.metadata
      ) {
        const { productId, instanceId } = pickResult.pickedMesh.metadata;
        const productMetadata = productMetadataMap.get(productId);

        if (onProductClickRef.current) {
          onProductClickRef.current(
            productId,
            productMetadata?.name || "Unknown Product",
            instanceId,
          );
        } else if (editorContext?.selectProduct) {
          editorContext.selectProduct(productId);
        }

        // Trigger a simple highlight animation on the picked mesh
        const mesh = pickResult.pickedMesh;
        const anim = new BABYLON.Animation(
          "clickBounce",
          "scaling",
          30,
          BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
          BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
        );
        const keys = [
          { frame: 0, value: new BABYLON.Vector3(1, 1, 1) },
          { frame: 5, value: new BABYLON.Vector3(1.05, 1.05, 1.05) },
          { frame: 10, value: new BABYLON.Vector3(1, 1, 1) },
        ];
        anim.setKeys(keys);
        mesh.animations = [anim];
        scene.beginAnimation(mesh, 0, 10);
      }
    };

    const handlePointerMove = (evt: PointerEvent) => {
      if (!rendererRef.current) return;
      const scene = (rendererRef.current as any).scene as BABYLON.Scene;
      if (!scene) return;

      const pickResult = scene.pick(evt.offsetX, evt.offsetY);
      if (
        pickResult.hit &&
        pickResult.pickedMesh &&
        pickResult.pickedMesh.metadata
      ) {
        const { instanceId } = pickResult.pickedMesh.metadata;
        if (onProductHover) {
          onProductHover(instanceId);
        }
      } else {
        if (onProductHover) {
          onProductHover(null);
        }
      }
    };

    canvasRef.current.addEventListener("pointerdown", handlePointerDown);
    canvasRef.current.addEventListener("pointermove", handlePointerMove);

    return () => {
      canvasRef.current?.removeEventListener("pointerdown", handlePointerDown);
      canvasRef.current?.removeEventListener("pointermove", handlePointerMove);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [assetProvider, productMetadataMap, editorContext]);

  // Sync Renderer State with Props/Context
  useEffect(() => {
    if (rendererRef.current && config && renderInstances) {
      rendererRef.current.render(renderInstances, config.fixture, projection);
      rendererRef.current.setSelection(
        selectedProductId || null,
        hoveredInstanceId || null,
        selectedInstanceIds,
      );
    }
  }, [
    config,
    renderInstances,
    projection,
    selectedProductId,
    selectedInstanceIds,
    hoveredInstanceId,
  ]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-muted/5 ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full outline-none touch-none"
      />
      <div className="absolute bottom-4 left-4 rounded bg-black/50 p-2 text-[10px] text-white backdrop-blur-sm">
        <p className="font-bold mb-0.5">3D High-Fidelity Rendering</p>
        <p>Left Click: Rotate • Right Click: Pan • Scroll: Zoom</p>
      </div>
    </div>
  );
}
