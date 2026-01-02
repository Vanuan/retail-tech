"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePlanogramData } from "@/lib/planogram-data-context";
import { PlanogramProvider } from "@/lib/planogram-context";
import { InteractivePlanogram2D } from "@/components/interactive-planogram-2d";
import { BabylonShelfRenderer } from "@/components/babylon-shelf-renderer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  LayoutGrid,
  Box,
} from "lucide-react";
import { ProductMetadata } from "@/lib/vst/types";

export interface ShelfExperienceResult {
  selectedProduct: { id: string; name: string } | null;
  timeElapsed: number;
  interactionLog: InteractionEvent[];
}

export interface InteractionEvent {
  timestamp: number;
  timeElapsed: number;
  action: string;
  details: any;
}

interface VSTShelfExperienceProps {
  planogramId: string;
  instructions?: string;
  onComplete?: (result: ShelfExperienceResult) => void;
  className?: string;
}

export function VSTShelfExperience({
  planogramId,
  instructions,
  onComplete,
  className,
}: VSTShelfExperienceProps) {
  return (
    <PlanogramProvider planogramId={planogramId}>
      <ShelfExperienceInner
        instructions={instructions}
        onComplete={onComplete}
        className={className}
      />
    </PlanogramProvider>
  );
}

function ShelfExperienceInner({
  instructions,
  onComplete,
  className,
}: {
  instructions?: string;
  onComplete?: (result: ShelfExperienceResult) => void;
  className?: string;
}) {
  const { config, renderInstances, metadata, isLoading, error } =
    usePlanogramData();

  const [rendererType, setRendererType] = useState<"2d" | "3d">("2d");
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Use a ref for timeElapsed to keep logInteraction stable
  const timeElapsedRef = useRef(0);
  useEffect(() => {
    timeElapsedRef.current = timeElapsed;
  }, [timeElapsed]);

  const [selectedInstanceIds, setSelectedInstanceIds] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [hoveredInstanceId, setHoveredInstanceId] = useState<string | null>(
    null,
  );
  const [interactionLog, setInteractionLog] = useState<InteractionEvent[]>([]);

  // Timer
  useEffect(() => {
    if (isLoading || error || !config) return;

    const timer = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isLoading, error, config]);

  // Logging helper - stabilized using timeElapsedRef
  const logInteraction = useCallback((action: string, details: any) => {
    const interaction: InteractionEvent = {
      timestamp: Date.now(),
      timeElapsed: timeElapsedRef.current,
      action,
      details,
    };
    setInteractionLog((prev) => [...prev, interaction]);
  }, []);

  // Initial load log
  useEffect(() => {
    if (config) {
      logInteraction("shelf_loaded", {
        planogramId: config.id,
        name: config.name,
      });
    }
  }, [config, logInteraction]);

  const handleProductClick = useCallback(
    (productId: string, productName: string, instanceId?: string) => {
      if (instanceId) {
        setSelectedInstanceIds((prev) => {
          const exists = prev.includes(instanceId);
          const next = exists
            ? prev.filter((id) => id !== instanceId)
            : [...prev, instanceId];

          // Sync selectedProduct for UI feedback (use latest selection)
          if (!exists) {
            setSelectedProduct({ id: productId, name: productName });
          } else if (next.length === 0) {
            setSelectedProduct(null);
          }

          return next;
        });
        logInteraction("instance_click", {
          productId,
          productName,
          instanceId,
        });
      } else {
        // Fallback for 2D or product-level selection
        setSelectedProduct({ id: productId, name: productName });
        logInteraction("product_click", { productId, productName });
      }
    },
    [logInteraction],
  );

  const handleProductHover = useCallback((instanceId: string | null) => {
    setHoveredInstanceId(instanceId);
  }, []);

  const handleConfirmSelection = () => {
    if (selectedInstanceIds.length === 0 && !selectedProduct) return;

    const finalLog = [
      ...interactionLog,
      {
        timestamp: Date.now(),
        timeElapsed,
        action: "purchase_confirmed",
        details: {
          productId: selectedProduct?.id,
          productName: selectedProduct?.name,
          selectedInstanceIds,
          timeToDecision: timeElapsed,
        },
      },
    ];

    onComplete?.({
      selectedProduct,
      timeElapsed,
      interactionLog: finalLog,
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Virtual Shelf...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md p-8 border-destructive/20">
          <div className="mb-6 flex items-center justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <h1 className="mb-2 text-center text-xl font-bold text-foreground">
            Error Loading Shelf
          </h1>
          <p className="text-center text-muted-foreground">
            {error.message || "Failed to load planogram data"}
          </p>
        </Card>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div
      className={`flex h-screen w-screen flex-col bg-background ${className || ""}`}
    >
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="font-mono">
            {config.name}
          </Badge>
          <div className="ml-4 flex items-center gap-1 rounded-md border border-border bg-muted p-1">
            <Button
              variant={rendererType === "2d" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 gap-2"
              onClick={() => setRendererType("2d")}
            >
              <LayoutGrid className="h-4 w-4" />
              2D View
            </Button>
            <Button
              variant={rendererType === "3d" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 gap-2"
              onClick={() => setRendererType("3d")}
            >
              <Box className="h-4 w-4" />
              3D View
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="font-mono">{formatTime(timeElapsed)}</span>
          </div>
          <Button
            onClick={handleConfirmSelection}
            disabled={selectedInstanceIds.length === 0 && !selectedProduct}
            size="sm"
          >
            {selectedInstanceIds.length > 0 || selectedProduct
              ? `Confirm Selection (${selectedInstanceIds.length || 1})`
              : "Select a Product"}
          </Button>
        </div>
      </header>

      {/* Instructions Bar */}
      {instructions && (
        <div className="border-b border-border bg-muted/30 px-6 py-3">
          <p className="text-sm text-foreground">{instructions}</p>
        </div>
      )}

      {/* Main Shelf Area */}
      <main className="flex-1 relative overflow-hidden bg-muted/5">
        {rendererType === "2d" ? (
          <div className="h-full w-full p-6 overflow-auto">
            <div className="mx-auto max-w-6xl h-full">
              <Card className="h-full w-full overflow-hidden border-2 border-dashed border-border bg-card relative">
                <InteractivePlanogram2D
                  key={config.id}
                  onProductClick={handleProductClick}
                  onProductHover={handleProductHover}
                />
              </Card>
            </div>
          </div>
        ) : (
          <div className="h-full w-full">
            <BabylonShelfRenderer
              config={config}
              renderInstances={renderInstances}
              onProductClick={handleProductClick}
              onProductHover={handleProductHover}
              selectedProductId={selectedProduct?.id}
              selectedInstanceIds={selectedInstanceIds}
              hoveredInstanceId={hoveredInstanceId}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Click on a product to select it, then confirm your choice
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Interactions: {interactionLog.length}</span>
            <span>•</span>
            <span>VST Secure Session</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
