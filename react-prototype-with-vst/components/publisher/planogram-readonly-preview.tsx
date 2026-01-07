"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  PlanogramConfig,
  RenderProjection,
  IAssetProvider as IBrowserAssetProvider,
} from "@vst/vocabulary-types";
import { TescoRenderer } from "@/lib/vst/implementations/renderers/tesco-renderer";
import { dal } from "@vst/data-access";
import {
  PlanogramDataProvider,
  usePlanogramData,
} from "@/lib/planogram-data-context";

interface PlanogramReadOnlyPreviewProps {
  config: PlanogramConfig;
  className?: string;
  padding?: number;
}

export function PlanogramReadOnlyPreview({
  config,
  className,
  padding,
}: PlanogramReadOnlyPreviewProps) {
  return (
    <PlanogramDataProvider initialConfig={config}>
      <PreviewInner className={className} padding={padding} />
    </PlanogramDataProvider>
  );
}

function PreviewInner({
  className = "",
  padding = 20,
}: {
  className?: string;
  padding?: number;
}) {
  const { config, renderInstances } = usePlanogramData();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<TescoRenderer | null>(null);

  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Handle Resize
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Initialize Renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    if (!rendererRef.current) {
      rendererRef.current = new TescoRenderer(
        dal.assets as IBrowserAssetProvider,
      );
      rendererRef.current.setShowPriceLabels(false);
    }

    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  // Preload Assets
  useEffect(() => {
    if (!config || renderInstances.length === 0) return;

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

  // Draw Loop
  useEffect(() => {
    const renderer = rendererRef.current;
    const canvas = canvasRef.current;

    if (
      !renderer ||
      !canvas ||
      !dimensions ||
      !config ||
      renderInstances.length === 0
    )
      return;

    // 1. Configure Engine
    renderer.initialize(canvas, {
      width: dimensions.width,
      height: dimensions.height,
      dpi: window.devicePixelRatio || 1,
    });

    // 2. Calculate "Best Fit" Projection
    const fixtureWidth = config.fixture.dimensions.width;
    const fixtureHeight = config.fixture.dimensions.height;

    const availableWidth = dimensions.width - padding * 2;
    const availableHeight = dimensions.height - padding * 2;

    const scaleX = availableWidth / fixtureWidth;
    const scaleY = availableHeight / fixtureHeight;
    const scale = Math.min(scaleX, scaleY);

    const drawnWidth = fixtureWidth * scale;
    const drawnHeight = fixtureHeight * scale;

    const offsetX = (dimensions.width - drawnWidth) / 2;
    const offsetY = (dimensions.height - drawnHeight) / 2;

    const projection: RenderProjection = {
      type: "orthographic",
      ppi: 1,
      zoom: scale,
      offset: { x: offsetX, y: offsetY, z: 0 },
    };

    // 3. Render
    renderer.render(renderInstances, config.fixture, projection);
  }, [dimensions, renderInstances, config, padding, assetsLoaded]);

  const isLoading = !config || renderInstances.length === 0;

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="block"
        style={{ width: "100%", height: "100%" }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
