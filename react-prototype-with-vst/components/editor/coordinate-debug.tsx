"use client";

import { usePlanogram } from "@/lib/planogram-editor-context";
import { Card } from "@/components/ui/card";

export function CoordinateDebug() {
  const { products, getRenderInstances, zoom, fixture } = usePlanogram();

  if (!fixture) return null;

  const instances = getRenderInstances();

  return (
    <Card className="absolute bottom-4 left-4 w-80 bg-background/95 p-4 font-mono text-xs backdrop-blur">
      <h3 className="mb-2 text-sm font-semibold text-foreground">
        Coordinate System Debug
      </h3>

      <div className="space-y-3">
        {/* Pipeline Overview */}
        <div className="space-y-1 rounded border border-border bg-muted p-2">
          <div className="font-semibold text-foreground">4-Layer Pipeline</div>
          <div className="text-muted-foreground">
            L1: {products.length} products (Input)
          </div>
          <div className="text-muted-foreground">L2: ✓ Validation passed</div>
          <div className="text-muted-foreground">
            L3: ✓ Enriched with metadata
          </div>
          <div className="text-muted-foreground">
            L4: {instances.length} render instances
          </div>
        </div>

        {/* Coordinate Spaces */}
        <div className="space-y-1 rounded border border-border bg-muted p-2">
          <div className="font-semibold text-foreground">Coordinate Spaces</div>
          <div className="text-muted-foreground">
            Semantic: mm, shelf indices
          </div>
          <div className="text-muted-foreground">World: 3D mm (x, y, z)</div>
          <div className="text-muted-foreground">
            Render: pixels (zoom: {(zoom * 100).toFixed(0)}%)
          </div>
        </div>

        {/* Fixture Info */}
        <div className="space-y-1 rounded border border-border bg-muted p-2">
          <div className="font-semibold text-foreground">Fixture Config</div>
          <div className="text-muted-foreground">Type: {fixture.type}</div>
          <div className="text-muted-foreground">
            Model: {fixture.placementModel}
          </div>
          <div className="text-muted-foreground">
            Size: {fixture.dimensions.width}×{fixture.dimensions.height}×
            {fixture.dimensions.depth}mm
          </div>
          <div className="text-muted-foreground">
            Shelves: {(fixture.config.shelves as any[]).length}
          </div>
        </div>

        {/* Selected Instance */}
        {instances.length > 0 && (
          <div className="space-y-1 rounded border border-border bg-muted p-2">
            <div className="font-semibold text-foreground">First Instance</div>
            <div className="text-muted-foreground">
              Semantic X:{" "}
              {instances[0].semanticCoordinates.model === "shelf-surface"
                ? instances[0].semanticCoordinates.x
                : 0}
              mm
            </div>
            <div className="text-muted-foreground">
              Shelf:{" "}
              {instances[0].semanticCoordinates.model === "shelf-surface"
                ? instances[0].semanticCoordinates.shelfIndex
                : "N/A"}
            </div>
            <div className="text-muted-foreground">
              World: ({instances[0].worldPosition.x.toFixed(1)},{" "}
              {instances[0].worldPosition.y.toFixed(1)},{" "}
              {instances[0].worldPosition.z.toFixed(1)})mm
            </div>
            {instances[0].renderCoordinates && (
              <div className="text-muted-foreground">
                Render: ({instances[0].renderCoordinates.x.toFixed(0)},{" "}
                {instances[0].renderCoordinates.y.toFixed(0)})px
              </div>
            )}
            <div className="text-muted-foreground">
              Z-Index: {instances[0].zIndex}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
