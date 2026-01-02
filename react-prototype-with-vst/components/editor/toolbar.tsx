"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePlanogram } from "@/lib/planogram-editor-context";
import {
  ZoomIn,
  ZoomOut,
  Info,
  Palette,
  Save,
  FilePlus,
  FolderOpen,
  Loader2,
} from "lucide-react";

interface ToolbarProps {
  showDebug: boolean;
  setShowDebug: (show: boolean) => void;

  rendererType: "standard" | "tesco";
  setRendererType: (type: "standard" | "tesco") => void;

  onNavigate?: (url: string) => void;
}

export function Toolbar({
  showDebug,
  setShowDebug,

  rendererType,
  setRendererType,
  onNavigate,
}: ToolbarProps) {
  const router = useRouter();
  const {
    viewport,
    applyZoom,
    selectedShelf,
    setSelectedShelf,
    fixture,
    getShelfSpaceUsed,
    savePlanogram,
    isSaving,
    hasUnsavedChanges,
    planogramName,
    setPlanogramName,
    savedPlanograms,
    renamePlanogram,
  } = usePlanogram();

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(planogramName);

  useEffect(() => {
    setTempName(planogramName);
  }, [planogramName]);

  const handleNameSubmit = () => {
    if (tempName && tempName !== planogramName) {
      renamePlanogram(tempName);
    } else {
      setTempName(planogramName);
    }
    setIsEditingName(false);
  };

  // Use VST config structure
  const shelves =
    (fixture?.config.shelves as Array<{ index: number; baseHeight: number }>) ||
    [];

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Active Shelf:
        </span>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
          {shelves.map((shelf) => {
            const spaceUsed = getShelfSpaceUsed(shelf.index);
            const percentUsed = fixture
              ? (spaceUsed / fixture.dimensions.width) * 100
              : 0;
            const isSelected = selectedShelf === shelf.index;

            return (
              <Button
                key={shelf.index}
                variant={isSelected ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSelectedShelf(shelf.index)}
                className="relative"
              >
                {shelf.index}
                {isSelected && (
                  <span className="ml-2 text-[10px] text-muted-foreground">
                    {Math.round(percentUsed)}%
                  </span>
                )}
              </Button>
            );
          })}
        </div>
        <span className="text-xs text-muted-foreground">
          ({Math.round(getShelfSpaceUsed(selectedShelf))} /{" "}
          {fixture?.dimensions.width}mm)
        </span>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
        <Button variant="ghost" size="sm" onClick={() => applyZoom(1.2)}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <span className="min-w-16 text-center text-xs font-mono text-muted-foreground">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <Button variant="ghost" size="sm" onClick={() => applyZoom(0.8)}>
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      <Button
        variant={showDebug ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setShowDebug(!showDebug)}
      >
        <Info className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
        <Button
          variant={rendererType === "standard" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setRendererType("standard")}
          className="text-xs"
        >
          Standard
        </Button>
        <Button
          variant={rendererType === "tesco" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setRendererType("tesco")}
          className="text-xs"
        >
          Tesco
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Name:
          </span>
          {isEditingName ? (
            <Input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSubmit();
                if (e.key === "Escape") {
                  setTempName(planogramName);
                  setIsEditingName(false);
                }
              }}
              autoFocus
              className="h-8 w-40 text-xs"
            />
          ) : (
            <div
              onClick={() => setIsEditingName(true)}
              className="flex h-8 w-40 cursor-pointer items-center rounded-md border border-transparent px-3 text-xs hover:bg-accent hover:text-accent-foreground"
              title="Click to rename"
            >
              {planogramName}
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Open
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="max-h-80 w-48 overflow-y-auto"
          >
            {savedPlanograms.length === 0 ? (
              <div className="p-2 text-xs text-muted-foreground">
                No saved planograms
              </div>
            ) : (
              savedPlanograms.map((planogram) => (
                <DropdownMenuItem
                  key={planogram.id}
                  onClick={() =>
                    onNavigate
                      ? onNavigate(`/editor/${planogram.id}`)
                      : router.push(`/editor/${planogram.id}`)
                  }
                  className="cursor-pointer text-xs"
                >
                  {planogram.name}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onNavigate ? onNavigate("/editor") : router.push("/editor")
          }
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <FilePlus className="h-3.5 w-3.5" />
          New
        </Button>
        <Button
          size="sm"
          onClick={savePlanogram}
          disabled={isSaving}
          variant={hasUnsavedChanges ? "default" : "ghost"}
          className="h-8 min-w-20 gap-1.5 text-xs relative"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {isSaving ? "Saving..." : "Save"}
          {hasUnsavedChanges && !isSaving && (
            <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
