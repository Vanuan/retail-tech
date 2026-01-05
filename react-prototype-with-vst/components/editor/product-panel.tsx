"use client";

import { usePlanogram } from "@/lib/planogram-editor-context";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus } from "lucide-react";

export function ProductPanel() {
  const { productMetadata, addProduct } = usePlanogram();

  const handleAddProduct = (sku: string) => {
    // Passing no position allows the Authority (CoreProcessor) to suggest the best placement
    addProduct(sku);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <h2 className="text-sm font-semibold text-foreground">
          Product Library
        </h2>
        <p className="text-xs text-muted-foreground">L3: Enriched Metadata</p>
      </div>

      <ScrollArea className="flex-1 overflow-auto">
        <div className="space-y-2 p-4">
          {Object.values(productMetadata).map((product) => (
            <div
              key={product.sku}
              className="group rounded-lg border border-border bg-background p-3 "
            >
              <div className="mb-2 flex items-center justify-between">
                <div
                  className="h-12 w-12 rounded"
                  style={{
                    backgroundImage: `url(${product.visualProperties.spriteVariants[0]?.url})`,
                    backgroundSize: "contain",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAddProduct(product.sku)}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <h3 className="text-xs font-medium text-foreground">
                {product.name}
              </h3>
              <p className="text-xs font-mono text-muted-foreground">
                {product.sku}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1 text-xs text-muted-foreground">
                <div>W: {product.dimensions.physical.width}</div>
                <div>H: {product.dimensions.physical.height}</div>
                <div>D: {product.dimensions.physical.depth}</div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
