"use client";

import { usePlanogram } from "@/lib/planogram-editor-context";
import { createFacingConfig } from "@vst/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Plus, Minus } from "lucide-react";
import { useEffect } from "react";

export function PropertiesPanel() {
  const {
    products,
    selectedProductId,
    updateProduct,
    removeProduct,
    productMetadata,
  } = usePlanogram();

  useEffect(() => {
    console.log(
      "[v0] PropertiesPanel - selectedProductId changed:",
      selectedProductId,
    );
    console.log(
      "[v0] PropertiesPanel - products:",
      products.map((p) => p.id),
    );
  }, [selectedProductId, products]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  console.log("[v0] PropertiesPanel - selectedProduct found:", selectedProduct);

  if (!selectedProduct) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="rounded-lg bg-muted p-6">
          <p className="text-sm text-muted-foreground">
            Select a product to view and edit its properties
          </p>
        </div>
      </div>
    );
  }

  const metadata = productMetadata[selectedProduct.sku];

  const handlePositionChange = (field: string, value: number) => {
    updateProduct(selectedProduct.id, {
      placement: {
        ...selectedProduct.placement,
        position: {
          ...selectedProduct.placement.position,
          [field]: value,
        },
      },
    });
  };

  const handleFacingsChange = (value: number) => {
    updateProduct(selectedProduct.id, {
      placement: {
        ...selectedProduct.placement,
        facings: createFacingConfig(value),
      },
    });
  };

  const currentFacings = selectedProduct.placement.facings?.horizontal ?? 1;

  const incrementFacings = () => {
    const newValue = Math.min(10, currentFacings + 1);
    handleFacingsChange(newValue);
  };

  const decrementFacings = () => {
    const newValue = Math.max(1, currentFacings - 1);
    handleFacingsChange(newValue);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <h2 className="text-sm font-semibold text-foreground">Properties</h2>
        <p className="text-xs text-muted-foreground">
          L1: Input Data (Semantic)
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          {/* Product Info */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground">
              Product Info
            </h3>
            <div
              className="h-16 w-16 rounded"
              style={{
                backgroundImage: `url(${metadata?.visualProperties.spriteVariants[0]?.url})`,
                backgroundSize: "contain",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            />
            <p className="text-sm font-medium text-foreground">
              {metadata?.name}
            </p>
            <p className="text-xs font-mono text-muted-foreground">
              {selectedProduct.sku}
            </p>
          </div>

          {/* Semantic Position */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-foreground">
              Semantic Position
            </h3>
            <div className="space-y-2">
              <div>
                <Label htmlFor="x" className="text-xs">
                  X Position (mm)
                </Label>
                <Input
                  id="x"
                  type="number"
                  value={(selectedProduct.placement.position as any).x ?? 0}
                  onChange={(e) =>
                    handlePositionChange("x", Number.parseFloat(e.target.value))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="shelf" className="text-xs">
                  Shelf Index
                </Label>
                <Input
                  id="shelf"
                  type="number"
                  min="0"
                  max="3"
                  value={
                    (selectedProduct.placement.position as any).shelfIndex ?? 0
                  }
                  onChange={(e) =>
                    handlePositionChange(
                      "shelfIndex",
                      Number.parseInt(e.target.value),
                    )
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="depth" className="text-xs">
                  Depth Level
                </Label>
                <Input
                  id="depth"
                  type="number"
                  min="0"
                  max="2"
                  value={(selectedProduct.placement.position as any).depth ?? 0}
                  onChange={(e) =>
                    handlePositionChange(
                      "depth",
                      Number.parseInt(e.target.value),
                    )
                  }
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Facings */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground">Facings</h3>
            <div>
              <Label htmlFor="facings" className="text-xs">
                Horizontal Facings
              </Label>
              <div className="mt-1 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={decrementFacings}
                  disabled={currentFacings <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="facings"
                  type="number"
                  min="1"
                  max="10"
                  value={currentFacings}
                  onChange={(e) =>
                    handleFacingsChange(Number.parseInt(e.target.value))
                  }
                  className="text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={incrementFacings}
                  disabled={currentFacings >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Total width:{" "}
                {Math.round(
                  metadata.dimensions.physical.width * currentFacings,
                )}
                mm
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => removeProduct(selectedProduct.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove Product
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
