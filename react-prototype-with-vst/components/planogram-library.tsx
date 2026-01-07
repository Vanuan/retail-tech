"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical, Trash2, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dal } from "@vst/data-access";
import { PlanogramConfig } from "@vst/vocabulary-types";
import { PlanogramReadOnlyPreview } from "@/components/publisher/planogram-readonly-preview";

export function PlanogramLibrary() {
  const [planograms, setPlanograms] = useState<PlanogramConfig[]>([]);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      // Ensure DAL is initialized (seeds mock data if needed)
      await dal.initialize();
      const items = await dal.planograms.listAll();
      setPlanograms(items);
    };
    load();
  }, []);

  const handleCreateNew = () => {
    router.push("/editor");
  };

  const handleOpen = (id: string) => {
    router.push(`/editor/${id}`);
  };

  const handleViewExperience = (id: string) => {
    router.push(`/shelf-experience/${id}`);
  };

  const handleDelete = async (planogram: PlanogramConfig) => {
    if (confirm(`Are you sure you want to delete '${planogram.name}'?`)) {
      await dal.planograms.delete(planogram.id);
      const items = await dal.planograms.listAll();
      setPlanograms(items);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary" />
            <span className="font-mono text-sm font-semibold text-foreground">
              VST Planogram Library
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Virtual Store Technology
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground">
              My Planograms
            </h1>
            <p className="text-sm text-muted-foreground">
              Create and manage your retail planograms
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* New Planogram Card */}
            <Card
              className="group relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 bg-muted/10 transition-colors hover:border-primary hover:bg-muted/20"
              onClick={handleCreateNew}
            >
              <Plus className="h-12 w-12 text-muted-foreground/50 transition-colors group-hover:text-primary" />
              <span className="mt-2 text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary">
                New Planogram
              </span>
            </Card>

            {/* Existing Planograms */}
            {planograms.map((planogram) => (
              <Card
                key={planogram.id}
                className="group relative flex aspect-[4/3] cursor-pointer flex-col overflow-hidden border border-border bg-card transition-all hover:shadow-lg"
                onClick={() => handleOpen(planogram.id)}
              >
                {/* Thumbnail Preview */}
                <div className="absolute inset-0 bg-muted overflow-hidden">
                  <PlanogramReadOnlyPreview config={planogram} padding={20} />
                </div>

                {/* Info Overlay (Ghost style) */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t border-border bg-card/80 backdrop-blur-sm p-3 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium text-foreground">
                      {planogram.name}
                    </h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewExperience(planogram.id);
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Experience
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(planogram);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
