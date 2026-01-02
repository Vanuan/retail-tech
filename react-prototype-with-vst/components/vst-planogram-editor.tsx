"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlanogramCanvas } from "@/components/editor/planogram-canvas";
import { ProductPanel } from "@/components/editor/product-panel";
import { ShelfPanel } from "@/components/editor/shelf-panel";
import { PropertiesPanel } from "@/components/editor/properties-panel";
import { Toolbar } from "@/components/editor/toolbar";
import { CoordinateDebug } from "@/components/editor/coordinate-debug";
import { usePlanogram } from "@/lib/planogram-editor-context";
import { PlanogramDataProvider } from "@/lib/planogram-data-context";
import { PlanogramEditorProvider } from "@/lib/planogram-editor-context";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VSTPlanogramEditorProps {
  planogramId: string;
}

export function VSTPlanogramEditor({ planogramId }: VSTPlanogramEditorProps) {
  const [showDebug, setShowDebug] = useState(false);
  const [rendererType, setRendererType] = useState<"standard" | "tesco">(
    "tesco",
  );

  return (
    <PlanogramDataProvider planogramId={planogramId}>
      <PlanogramEditorProvider>
        <PlanogramEditorInner
          showDebug={showDebug}
          setShowDebug={setShowDebug}
          rendererType={rendererType}
          setRendererType={setRendererType}
        />
      </PlanogramEditorProvider>
    </PlanogramDataProvider>
  );
}

function PlanogramEditorInner({
  showDebug,
  setShowDebug,
  rendererType,
  setRendererType,
}: {
  showDebug: boolean;
  setShowDebug: (v: boolean) => void;
  rendererType: "standard" | "tesco";
  setRendererType: (v: "standard" | "tesco") => void;
}) {
  const router = useRouter();
  const { hasUnsavedChanges, savePlanogram } = usePlanogram();
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const handleNavigate = (url: string) => {
    if (hasUnsavedChanges) {
      setPendingUrl(url);
    } else {
      router.push(url);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleNavigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Library
          </Button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary" />
            <span className="font-mono text-sm font-semibold text-foreground">
              VST Planogram Editor
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Virtual Store Technology
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Toolbar
            showDebug={showDebug}
            setShowDebug={setShowDebug}
            rendererType={rendererType}
            setRendererType={setRendererType}
            onNavigate={handleNavigate}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar - Product Library & Shelves */}
        <aside className="w-64 border-r border-border bg-card flex flex-col">
          <PanelGroup direction="vertical">
            <Panel defaultSize={50} minSize={25}>
              <ProductPanel />
            </Panel>
            <PanelResizeHandle className="h-px w-full bg-border" />
            <Panel defaultSize={50} minSize={25}>
              <ShelfPanel />
            </Panel>
          </PanelGroup>
        </aside>

        {/* Canvas Area */}
        <main className="relative flex-1 min-h-0">
          <PlanogramCanvas rendererType={rendererType} />
          {showDebug && <CoordinateDebug />}
        </main>

        {/* Right Sidebar - Properties */}
        <aside className="w-80 border-l border-border bg-card flex flex-col">
          <PropertiesPanel />
        </aside>
      </div>

      {/* Unsaved Changes Dialog */}
      <AlertDialog
        open={!!pendingUrl}
        onOpenChange={(open) => !open && setPendingUrl(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Unsaved Changes
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Would you like to save them before
              leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingUrl(null)}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="ghost"
              onClick={() => {
                if (pendingUrl) {
                  router.push(pendingUrl);
                  setPendingUrl(null);
                }
              }}
            >
              Leave without saving
            </Button>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                await savePlanogram();
                if (pendingUrl) {
                  router.push(pendingUrl);
                  setPendingUrl(null);
                }
              }}
            >
              Save and leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
