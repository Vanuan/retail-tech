"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { usePlanogramData } from "@/lib/planogram-data-context";
import { usePlanogram } from "@/lib/planogram-editor-context";
import { TescoRenderer } from "@/lib/vst/implementations/renderers/tesco-renderer";
import { dal } from "@vst/data-access";
import { IAssetProvider as IBrowserAssetProvider } from "@vst/vocabulary-types";
import { RenderProjection } from "@vst/vocabulary-types";
import { RenderInstance } from "@vst/vocabulary-types";
import { Projection } from "@/lib/vst/implementations/projection";
import { cn } from "@/lib/utils";

interface InteractivePlanogram2DProps {
  className?: string;
  onProductClick?: (
    productId: string,
    productName: string,
    instanceId?: string,
  ) => void;
  onProductHover?: (instanceId: string | null) => void;
  showControls?: boolean;
}

export function InteractivePlanogram2D({
  className,
  onProductClick,
  onProductHover,
  showControls = true,
}: InteractivePlanogram2DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<TescoRenderer | null>(null);

  // Interaction State
  const isDragging = useRef(false);
  const lastPointerPos = useRef<{ x: number; y: number } | null>(null);
  const hasMoved = useRef(false);

  // Data from contexts
  const { config, renderInstances } = usePlanogramData();
  const {
    viewport,
    zoomAt,
    panBy,
    fitToScreen,
    selectedProductId,
    selectedShelf,
  } = usePlanogram();

  // Local state for sizing
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Initialize Renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    if (!rendererRef.current) {
      rendererRef.current = new TescoRenderer(
        dal.assets as IBrowserAssetProvider,
      );
    }

    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  // Handle Resize
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Initial Fit
  const initialFitDone = useRef(false);
  useEffect(() => {
    if (
      !initialFitDone.current &&
      config &&
      dimensions &&
      dimensions.width > 0
    ) {
      fitToScreen(dimensions.width, dimensions.height);
      initialFitDone.current = true;
    }
  }, [config, dimensions, fitToScreen]);

  // Sync selection state to renderer
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setSelection(selectedProductId, null);
      rendererRef.current.setSelectedShelf(
        typeof selectedShelf === "number" ? selectedShelf : null,
      );
    }
  }, [selectedProductId, selectedShelf]);

  // Preload Assets
  useEffect(() => {
    if (!config) return;

    if (renderInstances.length === 0) {
      setAssetsLoaded(true);
      return;
    }

    let mounted = true;
    const loadAssets = async () => {
      try {
        const assetProvider = dal.assets as IBrowserAssetProvider;
        const urls = new Set<string>();

        renderInstances.forEach((inst) => {
          inst.assets.spriteVariants.forEach((v) => urls.add(v.url));
        });

        const fixtureAssets = config.fixture.visualProperties?.assets || {};
        Object.values(fixtureAssets).forEach((url) => {
          if (url) urls.add(url);
        });

        if (urls.size > 0) {
          await assetProvider.prefetch(Array.from(urls));
        }
      } catch (e) {
        console.error("Asset prefetch failed", e);
      } finally {
        if (mounted) setAssetsLoaded(true);
      }
    };

    setAssetsLoaded(false);
    loadAssets();

    return () => {
      mounted = false;
    };
  }, [renderInstances, config]);

  // Render Loop
  useEffect(() => {
    const renderer = rendererRef.current;
    if (
      !renderer ||
      !dimensions ||
      !config ||
      !canvasRef.current ||
      !assetsLoaded
    )
      return;

    // Update Renderer Size
    renderer.initialize(canvasRef.current, {
      width: dimensions.width,
      height: dimensions.height,
      dpi: window.devicePixelRatio || 1,
    });

    // Create Projection from Context State
    const projection: RenderProjection = {
      type: "orthographic",
      ppi: viewport.ppi,
      zoom: viewport.zoom,
      offset: viewport.offset,
    };

    renderer.render(renderInstances, config.fixture, projection);
  }, [viewport, renderInstances, config, dimensions, assetsLoaded]);

  // --- Interaction Logic ---

  const getScreenCoordinates = (e: React.MouseEvent | React.PointerEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const hitTest = useCallback(
    (screenX: number, screenY: number): RenderInstance | null => {
      if (!config) return null;

      const proj: RenderProjection = {
        type: "orthographic",
        ppi: viewport.ppi,
        zoom: viewport.zoom,
        offset: viewport.offset,
      };

      // Iterate in reverse (front-to-back visually)
      for (let i = renderInstances.length - 1; i >= 0; i--) {
        const inst = renderInstances[i];
        const pos = Projection.project(
          inst.worldPosition,
          config.fixture,
          proj,
        );
        const scale = proj.ppi * proj.zoom * inst.depthRatio;
        const w = inst.worldDimensions.width * scale;
        const h = inst.worldDimensions.height * scale;

        const left = pos.x - inst.anchorPoint.x * w;
        const top = pos.y - inst.anchorPoint.y * h;
        const right = left + w;
        const bottom = top + h;

        if (
          screenX >= left &&
          screenX <= right &&
          screenY >= top &&
          screenY <= bottom
        ) {
          return inst;
        }
      }
      return null;
    },
    [config, renderInstances, viewport],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const coords = getScreenCoordinates(e);

      // usePlanogram expects zoomAt(point, factor)
      const factor = Math.pow(1.001, -e.deltaY);
      zoomAt({ x: coords.x, y: coords.y }, factor);
    },
    [zoomAt],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
    lastPointerPos.current = { x: e.clientX, y: e.clientY };
    hasMoved.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const coords = getScreenCoordinates(e);

    if (isDragging.current && lastPointerPos.current) {
      const dx = e.clientX - lastPointerPos.current.x;
      const dy = e.clientY - lastPointerPos.current.y;

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        hasMoved.current = true;
      }

      panBy({ x: dx, y: dy });
      lastPointerPos.current = { x: e.clientX, y: e.clientY };
    } else {
      // Hover logic
      const hitInst = hitTest(coords.x, coords.y);
      // 2D mode doesn't support individual instance tracking yet
      onProductHover?.(null);

      // Update cursor
      if (containerRef.current) {
        containerRef.current.style.cursor = hitInst ? "pointer" : "default";
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (!hasMoved.current) {
      // Click
      const coords = getScreenCoordinates(e);
      const hitInst = hitTest(coords.x, coords.y);
      if (hitInst) {
        onProductClick?.(hitInst.sourceData.id, hitInst.metadata.name);
      }
    }

    isDragging.current = false;
    lastPointerPos.current = null;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full w-full overflow-hidden bg-muted/10",
        className,
      )}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ touchAction: "none" }}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        onContextMenu={(e) => e.preventDefault()}
      />

      {showControls && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md bg-background shadow-md hover:bg-accent"
            onClick={() =>
              dimensions && fitToScreen(dimensions.width, dimensions.height)
            }
            title="Reset View"
          >
            Fit
          </button>
        </div>
      )}
    </div>
  );
}
