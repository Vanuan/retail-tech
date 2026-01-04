"use client";

import { ReactNode } from "react";
import { PlanogramDataProvider } from "./planogram-data-context";
import { PlanogramEditorProvider } from "./planogram-editor-context";

/**
 * Legacy PlanogramProvider wrapper.
 * Composes the new Data and Editor providers to maintain backward compatibility
 * with existing components that rely on the monolithic context.
 */
export function PlanogramProvider({
  children,
  planogramId,
}: {
  children: ReactNode;
  planogramId?: string | null;
}) {
  return (
    <PlanogramDataProvider planogramId={planogramId || undefined}>
      <PlanogramEditorProvider>{children}</PlanogramEditorProvider>
    </PlanogramDataProvider>
  );
}

// Re-export types for backward compatibility
export type {
  SemanticPosition,
  FixtureConfig,
  ShelfConfig,
  SourceProduct,
  ProductMetadata,
  RenderInstance,
} from "@vst/vocabulary-types";
