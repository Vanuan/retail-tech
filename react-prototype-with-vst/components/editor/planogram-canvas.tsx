"use client";

import type React from "react";
import { useRef, useEffect, useState } from "react";
import {
  usePlanogram,
  type RenderInstance,
} from "@/lib/planogram-editor-context";
import { dal } from "@/lib/vst/implementations/repositories/data-access";
import {
  IAssetProvider as IBrowserAssetProvider,
  ShelfSurfacePosition,
  Millimeters,
  ShelfConfig,
  IVstRenderer,
} from "@vst/vocabulary-types";
import { createFacingConfig } from "@vst/utils";
import { placementRegistry } from "@/lib/vst/implementations";
import { Canvas2DRenderer } from "@/lib/vst/implementations/renderers/canvas-2d";
import { TescoRenderer } from "@/lib/vst/implementations/renderers/tesco-renderer";
import { BabylonRenderer } from "@/lib/vst/implementations/renderers/babylon-renderer";
import { Projection } from "@/lib/vst/implementations/projection";

interface PlanogramCanvasProps {
  rendererType: "standard" | "tesco" | "3d";
}

export function PlanogramCanvas({ rendererType }: PlanogramCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const assetProvider = dal.assets as IBrowserAssetProvider;
  const renderer = useRef<IVstRenderer | null>(null);
  const lastInstances = useRef<RenderInstance[]>([]);
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [hoveredInstanceId, setHoveredInstanceId] = useState<string | null>(
    null,
  );

  const [isDraggingShelf, setIsDraggingShelf] = useState(false);
  const [draggedShelfId, setDraggedShelfId] = useState<string | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProductId, setDragProductId] = useState<string | null>(null);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [dragStartWorldOffset, setDragStartWorldOffset] = useState({
    x: 0,
    y: 0,
  });

  const [isDraggingFacings, setIsDraggingFacings] = useState(false);
  const [facingsDragStartX, setFacingsDragStartX] = useState(0);
  const [facingsDragInitialFacings, setFacingsDragInitialFacings] = useState(0);
  const [hoveredAnchor, setHoveredAnchor] = useState<string | null>(null);

  const {
    fixture,
    getRenderInstances,
    selectedProductId,
    selectProduct,
    productMetadata,
    selectedShelf,
    setSelectedShelf,
    getShelfSpaceUsed,
    viewport,
    zoomAt,
    panBy,
    resizeViewport,
    getVisibleInstances,
    updateProduct,
    validatePlacement,
    products,
    updateShelf,
    reindexShelves,
    undo,
    redo,
    canUndo,
    canRedo,
    snapshot,
  } = usePlanogram();

  const getProductGroupBounds = (productId: string) => {
    const instances = lastInstances.current;
    const groupInstances = instances.filter(
      (inst) => inst.sourceData.id === productId,
    );
    if (groupInstances.length === 0) return null;

    const sortedInstances = [...groupInstances].sort(
      (a, b) => a.worldPosition.x - b.worldPosition.x,
    );
    const firstInstance = sortedInstances[0];
    const lastInstance = sortedInstances[sortedInstances.length - 1];
    if (!firstInstance.renderCoordinates || !lastInstance.renderCoordinates)
      return null;

    return {
      x: firstInstance.renderCoordinates.x,
      y: firstInstance.renderCoordinates.y,
      width:
        lastInstance.renderCoordinates.x +
        lastInstance.renderCoordinates.width -
        firstInstance.renderCoordinates.x,
      height: firstInstance.renderCoordinates.height,
      lastInstance,
    };
  };

  const findHitAnchor = (
    mouseX: number,
    mouseY: number,
    productId: string | null,
  ) => {
    if (!productId) return null;
    const bounds = getProductGroupBounds(productId);
    if (!bounds || !bounds.lastInstance.renderCoordinates) return null;

    const anchorX =
      bounds.lastInstance.renderCoordinates.x +
      bounds.lastInstance.renderCoordinates.width;
    const anchorY =
      bounds.lastInstance.renderCoordinates.y +
      bounds.lastInstance.renderCoordinates.height / 2;
    const anchorSize = 16;

    const hit =
      mouseX >= anchorX - anchorSize / 2 &&
      mouseX <= anchorX + anchorSize / 2 &&
      mouseY >= anchorY - anchorSize / 2 &&
      mouseY <= anchorY + anchorSize / 2;

    return hit ? { x: anchorX, y: anchorY, size: anchorSize } : null;
  };

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for Undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          // Ctrl+Shift+Z or Cmd+Shift+Z for Redo
          if (canRedo) {
            e.preventDefault();
            redo();
          }
        } else {
          if (canUndo) {
            e.preventDefault();
            undo();
          }
        }
      }
      // Ctrl+Y or Cmd+Y for Redo
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        if (canRedo) {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  useEffect(() => {
    if (!fixture) return;

    const productImages = Object.values(productMetadata)
      .map((metadata) => metadata.visualProperties.spriteVariants[0]?.url)
      .filter((url): url is string => !!url);

    const assets = fixture.visualProperties?.assets || {};
    const fixtureImagesUrls = Object.values(assets).filter(
      (url): url is string => !!url,
    );

    const allUrls = [...productImages, ...fixtureImagesUrls];

    assetProvider.prefetch(allUrls).then(() => {
      setImagesLoaded(true);
    });
  }, [productMetadata, fixture]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasDimensions({ width, height });
        resizeViewport(width, height);
      }
    });

    resizeObserver.observe(canvas);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    // Re-create renderer if type changes
    if (renderer.current) {
      const isTesco = renderer.current instanceof TescoRenderer;
      const isBabylon = renderer.current instanceof BabylonRenderer;

      let needsRecreate = false;
      if (rendererType === "tesco" && !isTesco) needsRecreate = true;
      if (rendererType === "3d" && !isBabylon) needsRecreate = true;
      if (rendererType === "standard" && (isTesco || isBabylon))
        needsRecreate = true;

      if (needsRecreate) {
        renderer.current.dispose();
        renderer.current = null;
      }
    }

    if (!renderer.current) {
      if (rendererType === "tesco") {
        renderer.current = new TescoRenderer(assetProvider);
      } else if (rendererType === "3d") {
        renderer.current = new BabylonRenderer(assetProvider);
      } else {
        renderer.current = new Canvas2DRenderer(assetProvider);
      }
    }

    const canvas = canvasRef.current;
    if (
      !canvas ||
      canvasDimensions.width === 0 ||
      canvasDimensions.height === 0 ||
      !fixture
    )
      return;

    // 1. Use Projection from Context
    const projection = viewport;

    // 2. Sync Renderer State
    renderer.current.initialize(canvas, {
      width: canvasDimensions.width,
      height: canvasDimensions.height,
      dpi: window.devicePixelRatio,
      clearColor: "#ffffff",
    });

    if (renderer.current instanceof TescoRenderer) {
      renderer.current.setSelection(selectedProductId, hoveredInstanceId);
      renderer.current.setSelectedShelf(selectedShelf);
    } else if (renderer.current instanceof Canvas2DRenderer) {
      renderer.current.setSelection(selectedProductId, hoveredInstanceId);
    }

    // 3. Render World
    // getVisibleInstances from context handles fetching and culling
    const visibleInstances = getVisibleInstances();

    if (products.length > 0 && visibleInstances.length === 0) {
      console.warn(
        `[PlanogramCanvas] Disappearing product detected! ${products.length} products in state but 0 visible instances.`,
      );
    }

    lastInstances.current = visibleInstances;
    renderer.current.render(visibleInstances, fixture, projection);

    // 4. Draw UI Overlays (Anchors)
    const ctx = canvas.getContext("2d");
    if (ctx) {
      if (selectedProductId) {
        const selectedInstances = visibleInstances.filter(
          (inst) => inst.sourceData.id === selectedProductId,
        );
        if (selectedInstances.length > 0) {
          drawFacingsAnchor(
            ctx,
            selectedInstances,
            hoveredAnchor === selectedProductId,
          );
        }
      }

      // Draw shelf drag handles
      const shelves = (fixture.config.shelves as any[]) || [];
      const handleWidth = 35;
      const handleHeight = 36;
      const vProps = fixture.visualProperties;
      const uprightWidth =
        (vProps?.dimensions?.uprightWidth ?? 45) * viewport.zoom;
      const handleX = projection.offset.x - uprightWidth - handleWidth - 5;

      shelves.forEach((shelf) => {
        const shelfY =
          projection.offset.y +
          (fixture.dimensions.height - shelf.baseHeight) * viewport.zoom;
        const isBaseShelf = shelf.index === 0;

        ctx.save();
        const isShelfSelected =
          shelf.index === selectedShelf || shelf.id === draggedShelfId;

        if (isBaseShelf) {
          ctx.fillStyle = "rgba(100, 100, 100, 0.2)";
          ctx.strokeStyle = "rgba(100, 100, 100, 0.4)";
        } else {
          ctx.fillStyle = isShelfSelected
            ? "rgba(59, 130, 246, 0.8)"
            : "rgba(107, 114, 128, 0.4)";
          ctx.strokeStyle = isShelfSelected
            ? "rgba(37, 99, 235, 1)"
            : "rgba(75, 85, 99, 0.8)";
        }

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(
          handleX,
          shelfY - handleHeight / 2,
          handleWidth,
          handleHeight,
          4,
        );
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isShelfSelected && !isBaseShelf ? "white" : "#444";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `bold ${Math.max(10, 12 * viewport.zoom)}px sans-serif`;
        ctx.fillText(`${shelf.index}`, handleX + handleWidth / 2, shelfY);
        ctx.restore();
      });
    }
  }, [
    canvasDimensions,
    fixture,
    getVisibleInstances,
    selectedProductId,
    hoveredInstanceId,
    viewport,
    productMetadata,
    selectedShelf,
    getShelfSpaceUsed,
    imagesLoaded,
    isDragging,
    dragProductId,
    hoveredAnchor,
    rendererType,
    draggedShelfId,
  ]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // --- Shelf Dragging Logic ---
    if (fixture) {
      const projection = viewport;
      const shelves = (fixture.config.shelves as any[]) || [];
      const handleWidth = 35;
      const handleHeight = 36;
      const uprightWidth =
        (fixture.visualProperties?.dimensions?.uprightWidth ?? 45) *
        viewport.zoom;
      const handleX = projection.offset.x - uprightWidth - handleWidth - 5;

      for (const shelf of shelves) {
        const shelfY =
          projection.offset.y +
          (fixture.dimensions.height - shelf.baseHeight) * viewport.zoom;
        const isBaseShelf = shelf.index === 0;

        if (
          mouseX >= handleX &&
          mouseX <= handleX + handleWidth &&
          mouseY >= shelfY - handleHeight / 2 &&
          mouseY <= shelfY + handleHeight / 2
        ) {
          if (isBaseShelf) {
            setSelectedShelf(shelf.index);
            selectProduct(null);
            return;
          }
          setIsDraggingShelf(true);
          setDraggedShelfId(shelf.id);
          setLastMousePos({ x: mouseX, y: mouseY });
          setSelectedShelf(shelf.index);
          return;
        }
      }
    }
    // --- End Shelf Dragging ---

    setLastMousePos({ x: mouseX, y: mouseY });

    const worldPos = Projection.unproject(
      { x: mouseX, y: mouseY },
      fixture!,
      viewport,
    );
    const hit = snapshot?.indices.resolveWorldPoint(worldPos.x, worldPos.y);

    // 1. Check Facings Anchor
    const anchorHit = findHitAnchor(mouseX, mouseY, selectedProductId);
    if (anchorHit) {
      const product = snapshot?.indices.productById.get(
        selectedProductId!,
      )?.sourceData;
      if (product) {
        setIsDraggingFacings(true);
        setFacingsDragStartX(mouseX);
        setFacingsDragInitialFacings(
          product.placement.facings?.horizontal ?? 1,
        );
        return;
      }
    }

    // 2. Check Product Groups (Semantic)
    if (hit?.type === "product") {
      const product = snapshot?.indices.productById.get(hit.id)?.sourceData;
      const productPos = product?.placement.position as any;

      setIsDragging(true);
      setDragProductId(hit.id);

      // Calculate offset in World Space (mm)
      setDragStartWorldOffset({
        x: worldPos.x - (productPos?.x ?? worldPos.x),
        y: worldPos.y - (productPos?.y ?? worldPos.y),
      });

      selectProduct(hit.id);
      return;
    }

    // 3. Check Shelves (Semantic)
    if (hit?.type === "shelf") {
      setSelectedShelf(hit.index!);
      selectProduct(null);
      return;
    }

    setIsPanning(true);
    selectProduct(null);
  };

  const handleMouseMoveInteraction = (
    e: React.MouseEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // --- Shelf Dragging ---
    if (isDraggingShelf && draggedShelfId && fixture) {
      const dy = mouseY - lastMousePos.y;
      // Screen Y increases downwards, World Y increases upwards.
      const deltaHeight = dy / viewport.zoom;

      const shelves = (fixture.config.shelves as ShelfConfig[]) || [];
      const draggedShelf = shelves.find((s) => s.id === draggedShelfId);

      if (draggedShelf && draggedShelf.index !== 0) {
        const newHeight = draggedShelf.baseHeight - deltaHeight;
        // Clamp to avoid going below 0 or above fixture height (with some top margin)
        const clampedHeight = Math.max(
          10,
          Math.min(fixture.dimensions.height - 100, newHeight),
        );

        updateShelf(draggedShelf.index, {
          baseHeight: clampedHeight as Millimeters,
        });
      }

      setLastMousePos({ x: mouseX, y: mouseY });
      canvas.style.cursor = "ns-resize";
      return;
    }

    if (isDraggingFacings && selectedProductId) {
      const product =
        snapshot?.indices.productById.get(selectedProductId)?.sourceData;
      if (product) {
        const metadata = productMetadata[product.sku];
        if (metadata) {
          const scale = viewport.zoom;
          const deltaX = mouseX - facingsDragStartX;
          const widthPerFacingPx = metadata.dimensions.physical.width * scale;

          let facingsDelta = Math.round(deltaX / widthPerFacingPx);
          if (isNaN(facingsDelta) || !isFinite(facingsDelta)) facingsDelta = 0;

          const newFacings = Math.max(
            1,
            Math.min(100, facingsDragInitialFacings + facingsDelta),
          );

          if (newFacings !== product.placement.facings?.horizontal) {
            // Validate bounds and collisions before updating
            const validation = validatePlacement(
              product.sku,
              product.placement.position,
              newFacings,
              product.id,
            );

            if (validation.valid) {
              updateProduct(
                selectedProductId,
                {
                  placement: {
                    ...product.placement,
                    facings: createFacingConfig(
                      newFacings,
                      product.placement.facings?.vertical ?? 1,
                    ),
                  },
                },
                true,
              );
            }
          }
        }
      }
      canvas.style.cursor = "ew-resize";
      return;
    }

    if (isPanning) {
      const dx = mouseX - lastMousePos.x;
      const dy = mouseY - lastMousePos.y;
      panBy({ x: dx, y: dy });
      setLastMousePos({ x: mouseX, y: mouseY });
      canvas.style.cursor = "grabbing";
      return;
    }

    if (isDragging && dragProductId && fixture) {
      const projection = viewport;

      const product =
        snapshot?.indices.productById.get(dragProductId)?.sourceData;
      const metadata = product ? productMetadata[product.sku] : null;
      const pModel =
        placementRegistry.get(fixture.placementModel) ||
        placementRegistry.get("shelf-surface");

      if (product && metadata && pModel) {
        // Unproject the current mouse position
        const currentWorldPos = renderer.current?.screenToWorld({
          x: mouseX,
          y: mouseY,
        }) || { x: 0, y: 0, z: 0 };

        // Apply the original world-space offset to find the target semantic origin
        const targetWorldX = currentWorldPos.x - dragStartWorldOffset.x;
        const targetWorldY = currentWorldPos.y - dragStartWorldOffset.y;

        const projectedPosition = pModel.project(
          {
            x: targetWorldX,
            y: targetWorldY,
            z: 0,
          },
          fixture,
        );

        // Clamping logic for shelf-surface: prevent dragging off the right edge
        let newPosition = projectedPosition;
        if (projectedPosition.model === "shelf-surface") {
          const shelfPos = projectedPosition as ShelfSurfacePosition;

          // Prevent state corruption from NaN/Infinity values
          if (isNaN(shelfPos.x) || !isFinite(shelfPos.x)) return;

          const facings = product.placement.facings?.horizontal ?? 1;
          const totalWidth = metadata.dimensions.physical.width * facings;
          const maxX = fixture.dimensions.width - totalWidth;

          newPosition = {
            ...shelfPos,
            x: Math.max(0, Math.min(maxX, shelfPos.x)) as Millimeters,
          } as ShelfSurfacePosition;
        }

        // Validate movement (Physics Restrictions)
        const validation = validatePlacement(
          product.sku,
          newPosition,
          product.placement.facings?.horizontal || 1,
          dragProductId,
        );

        if (validation.valid) {
          updateProduct(
            dragProductId,
            {
              placement: {
                ...product.placement,
                position: newPosition,
              },
            },
            true,
          );
        }
      }

      canvas.style.cursor = "grabbing";
      return;
    }

    const worldPos = Projection.unproject(
      { x: mouseX, y: mouseY },
      fixture!,
      viewport,
    );
    const hit = snapshot?.indices.resolveWorldPoint(worldPos.x, worldPos.y);

    // 1. Check Facings Anchor Hover
    const anchorHit = findHitAnchor(mouseX, mouseY, selectedProductId);
    if (anchorHit) {
      setHoveredAnchor(selectedProductId);
      canvas.style.cursor = "ew-resize";
      return;
    }
    setHoveredAnchor(null);

    // 2. Check Product/Instance Hover (Semantic)
    if (hit?.type === "product") {
      setHoveredInstanceId(hit.id);
      canvas.style.cursor = "pointer";
      return;
    }

    setHoveredInstanceId(null);
    canvas.style.cursor = "default";
  };

  const handleMouseUp = () => {
    if (isDraggingShelf) {
      reindexShelves();
    }
    setIsDraggingShelf(false);
    setDraggedShelfId(null);

    setIsPanning(false);
    setIsDragging(false);
    setDragProductId(null);
    setIsDraggingFacings(false);

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = "default";
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Click is handled in mousedown/mouseup to support drag
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleMouseMoveInteraction(e);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!fixture) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;

    zoomAt({ x: mouseX, y: mouseY }, zoomFactor);
  };

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full"
      onClick={handleCanvasClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    />
  );
}

function drawFacingsAnchor(
  ctx: CanvasRenderingContext2D,
  instances: RenderInstance[],
  isHovered: boolean,
) {
  if (instances.length === 0) return;

  const sortedInstances = [...instances].sort(
    (a, b) =>
      a.zLayerProperties.facingContribution -
      b.zLayerProperties.facingContribution,
  );
  const lastInstance = sortedInstances[sortedInstances.length - 1];

  if (!lastInstance.renderCoordinates) return;

  // The anchor is placed at the right-edge center of the last horizontal facing.
  // This now correctly follows the anchor-adjusted render coordinates.
  const anchorX =
    lastInstance.renderCoordinates.x + lastInstance.renderCoordinates.width;
  const anchorY =
    lastInstance.renderCoordinates.y +
    lastInstance.renderCoordinates.height / 2;
  const anchorSize = 18;

  // Draw Outer Circle with a subtle shadow
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = isHovered ? "#3b82f6" : "#ffffff";
  ctx.beginPath();
  ctx.arc(anchorX, anchorY, anchorSize / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.restore();

  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw Resize Handle Icon (horizontal arrows)
  ctx.beginPath();
  ctx.strokeStyle = isHovered ? "#ffffff" : "#3b82f6";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  // Main horizontal line
  ctx.moveTo(anchorX - 5, anchorY);
  ctx.lineTo(anchorX + 5, anchorY);
  // Left arrow head
  ctx.moveTo(anchorX - 2, anchorY - 3);
  ctx.lineTo(anchorX - 5, anchorY);
  ctx.lineTo(anchorX - 2, anchorY + 3);
  // Right arrow head
  ctx.moveTo(anchorX + 2, anchorY - 3);
  ctx.lineTo(anchorX + 5, anchorY);
  ctx.lineTo(anchorX + 2, anchorY + 3);
  ctx.stroke();
}
