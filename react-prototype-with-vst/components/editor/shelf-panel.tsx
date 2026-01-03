"use client";

import { usePlanogram } from "@/lib/planogram-editor-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, ListRestart } from "lucide-react";
import { Millimeters, ShelfConfig } from "@vst/vocabulary-types";

export function ShelfPanel() {
  const {
    fixture,
    addShelf,
    removeShelf,
    updateShelf,
    reindexShelves,
    selectedShelf,
    setSelectedShelf,
  } = usePlanogram();

  if (!fixture) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <p className="text-sm text-muted-foreground">No fixture loaded</p>
      </div>
    );
  }

  const shelves = (fixture.config.shelves as ShelfConfig[]) || [];

  const handleAddShelf = () => {
    const lastShelfHeight =
      shelves.length > 0
        ? Math.max(...shelves.map((s) => s.baseHeight as number))
        : -400;
    addShelf();
  };

  const handleUpdateHeight = (index: number, newHeight: number) => {
    if (!isNaN(newHeight)) {
      updateShelf(index, { baseHeight: newHeight as Millimeters });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <h2 className="text-sm font-semibold text-foreground">
          Fixture Configuration
        </h2>
        <p className="text-xs text-muted-foreground">Shelves & Structure</p>
      </div>

      <div className="border-b border-border p-4">
        <div className="flex justify-between gap-2">
          <Button size="sm" onClick={handleAddShelf} className="w-full">
            <Plus className="mr-2 h-4 w-4" /> Add Shelf
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={reindexShelves}
            className="w-full"
          >
            <ListRestart className="mr-2 h-4 w-4" /> Re-index
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-auto">
        <div className="space-y-2 p-4">
          {shelves
            .sort((a, b) => a.index - b.index)
            .map((shelf) => (
              <div
                key={shelf.id}
                className={`group cursor-pointer rounded-lg border p-3 ${
                  shelf.index === selectedShelf
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background"
                }`}
                onClick={() => setSelectedShelf(shelf.index)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-foreground">
                    Shelf #{shelf.index} {shelf.index === 0 && "(Base)"}
                  </h3>
                  {shelf.index !== 0 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeShelf(shelf.index);
                      }}
                      className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="mt-2">
                  <label
                    htmlFor={`shelf-height-${shelf.id}`}
                    className="text-xs text-muted-foreground"
                  >
                    Base Height (mm)
                  </label>
                  <Input
                    id={`shelf-height-${shelf.id}`}
                    type="number"
                    value={shelf.baseHeight}
                    disabled={shelf.index === 0}
                    onChange={(e) =>
                      handleUpdateHeight(
                        shelf.index,
                        parseInt(e.target.value, 10),
                      )
                    }
                    onBlur={() => reindexShelves()}
                    onClick={(e) => e.stopPropagation()}
                    className="h-8"
                  />
                </div>
              </div>
            ))}
        </div>
      </ScrollArea>
    </div>
  );
}
