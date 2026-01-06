"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { usePlanogramData } from "./planogram-data-context";
import {
  SourceProduct,
  ProductMetadata,
  ShelfConfig,
  FixtureConfig,
  PlanogramConfig,
  ShelfIndex,
  Millimeters,
  RenderInstance,
  SemanticPosition,
  PlacementSuggestion,
  ValidationResult,
} from "@vst/vocabulary-types";

export type { RenderInstance };
import { isShelfSurfacePosition, createFacingConfig } from "@vst/vocabulary-logic";
import {
  usePlanogramSession,
  PlanogramSnapshot,
  PlanogramActions,
  PlanogramAction,
} from "@vst/session";

import { dal } from "./vst/implementations/repositories/data-access";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

const generateId = () => Math.random().toString(36).substring(2, 9);

interface ViewportState {
  type: "orthographic";
  ppi: number;
  zoom: number;
  offset: { x: number; y: number; z: number };
}

interface PlanogramEditorContextType {
  // State
  fixture: FixtureConfig | null;
  products: readonly SourceProduct[];
  productMetadata: Record<string, ProductMetadata>;
  renderInstances: RenderInstance[];
  snapshot: PlanogramSnapshot | null;

  // Selection
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  selectedShelf: number;
  setSelectedShelf: (index: number) => void;

  // Viewport
  viewport: ViewportState;
  setViewport: (v: ViewportState) => void;
  zoomAt: (point: { x: number; y: number }, factor: number) => void;
  applyZoom: (factor: number) => void;
  panBy: (delta: { x: number; y: number }) => void;
  fitToScreen: (width: number, height: number) => void;
  unprojectPoint: (x: number, y: number) => { x: number; y: number; z: number };

  // Mutations
  addProduct: (sku: string, position?: any) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  updateProduct: (
    id: string,
    updates: Partial<SourceProduct>,
    silent?: boolean,
  ) => Promise<void>;
  selectProduct: (id: string | null) => void;

  addShelf: () => void;
  removeShelf: (index: number) => void;
  updateShelf: (index: number, updates: Partial<ShelfConfig>) => Promise<void>;
  reindexShelves: () => Promise<void>;

  // Session
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  isProjecting: boolean;
  hasUnsavedChanges: boolean;
  commit: () => Promise<void>;

  // File
  planogramName: string;
  setPlanogramName: (name: string) => void;
  savePlanogram: () => Promise<void>;
  isSaving: boolean;
  createNewPlanogram: () => Promise<void>;
  renamePlanogram: (name: string) => Promise<void>;
  savedPlanograms: PlanogramConfig[];
  refreshSavedPlanograms: () => Promise<void>;

  // Helpers
  getRenderInstances: () => RenderInstance[];
  getVisibleInstances: () => RenderInstance[];
  resizeViewport: (width: number, height: number) => void;
  getShelfSpaceUsed: (index: number) => number;
  suggestPlacement: (input: {
    sku: string;
    preferredShelf?: ShelfIndex;
  }) => PlacementSuggestion | null;
  validateIntent: (action: PlanogramAction) => ValidationResult;
}

export const PlanogramEditorContext =
  createContext<PlanogramEditorContextType | null>(null);

export function usePlanogramEditor() {
  const context = useContext(PlanogramEditorContext);
  if (!context) {
    throw new Error(
      "usePlanogramEditor must be used within a PlanogramEditorProvider",
    );
  }
  return context;
}

export function usePlanogram() {
  return usePlanogramEditor();
}

export function PlanogramEditorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    config,
    metadata,
    updateConfig,
    savePlanogram,
    setConfig,
    renderInstances: dataRenderInstances,
    hasUnsavedChanges: dataDirty,
    isSaving,
  } = usePlanogramData();

  // --- Session ---
  const {
    session,
    snapshot,
    canUndo,
    canRedo,
    isProjecting,
  } = usePlanogramSession(config, metadata, dal);

  useEffect(() => {
    if (snapshot) setConfig(snapshot.config);
  }, [snapshot, setConfig]);

  const renderInstances = snapshot?.renderInstances || dataRenderInstances;
  const products = snapshot?.config.products || config?.products || [];
  const fixture = snapshot?.config.fixture || config?.fixture || null;

  const productMetadata = useMemo(() => {
    const record: Record<string, ProductMetadata> = {};
    metadata?.forEach((m, sku) => {
      record[sku] = m;
    });
    return record;
  }, [metadata]);

  // --- Selection ---
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [selectedShelfState, setSelectedShelfState] = useState<number>(0);

  const selectProduct = useCallback(
    (id: string | null) => {
      setSelectedProductId(id);
      session?.setSelection(id ? [id] : []);
    },
    [session],
  );

  // --- Viewport ---
  const [viewport, setViewport] = useState<ViewportState>({
    type: "orthographic",
    ppi: 1,
    zoom: 1,
    offset: { x: 0, y: 0, z: 0 },
  });

  const zoomAt = useCallback(
    (point: { x: number; y: number }, factor: number) => {
      setViewport((prev) => {
        const newZoom = Math.max(0.1, Math.min(prev.zoom * factor, 10));
        const worldX = (point.x - prev.offset.x) / prev.zoom;
        const worldY = (point.y - prev.offset.y) / prev.zoom;
        return {
          ...prev,
          offset: {
            ...prev.offset,
            x: point.x - worldX * newZoom,
            y: point.y - worldY * newZoom,
          },
          zoom: newZoom,
        };
      });
    },
    [],
  );

  const panBy = useCallback((delta: { x: number; y: number }) => {
    setViewport((prev) => ({
      ...prev,
      offset: {
        ...prev.offset,
        x: prev.offset.x + delta.x,
        y: prev.offset.y + delta.y,
      },
    }));
  }, []);

  const applyZoom = useCallback(
    (factor: number) => {
      setViewport((prev) => ({
        ...prev,
        zoom: prev.zoom * factor,
      }));
    },
    [setViewport],
  );

  const fitToScreen = useCallback(
    (width: number, height: number) => {
      if (!fixture) return;
      const fw = fixture.dimensions.width;
      const fh = fixture.dimensions.height;
      const padding = 40;
      const scale = Math.min(
        (width - padding * 2) / fw,
        (height - padding * 2) / fh,
      );
      setViewport({
        type: "orthographic",
        ppi: 1,
        offset: {
          x: (width - fw * scale) / 2,
          y: (height - fh * scale) / 2,
          z: 0,
        },
        zoom: scale,
      });
    },
    [fixture],
  );

  const unprojectPoint = useCallback(
    (x: number, y: number) => ({
      x: (x - viewport.offset.x) / viewport.zoom,
      y: (y - viewport.offset.y) / viewport.zoom,
      z: 0,
    }),
    [viewport],
  );

  // --- Saved Files State ---
  const [savedPlanograms, setSavedPlanograms] = useState<PlanogramConfig[]>([]);

  const refreshSavedPlanograms = useCallback(async () => {
    try {
      const all = await dal.planograms.listAll();
      setSavedPlanograms(all);
    } catch (e) {
      console.error("Failed to list planograms", e);
    }
  }, []);

  useEffect(() => {
    refreshSavedPlanograms();
  }, [refreshSavedPlanograms]);

  // --- Convenience Mutations ---
  const addProduct = useCallback(
    async (sku: string, position?: any) => {
      if (!session) return;
      const meta = metadata?.get(sku);
      if (!meta) return;

      let targetPos = position;

      if (!targetPos) {
        const suggestion = session.suggestPlacement({
          sku,
          preferredShelf: selectedShelfState as ShelfIndex,
        });

        if (suggestion) {
          targetPos = suggestion.position;
        } else {
          toast.error("No space available");
          return;
        }
      }

      if (targetPos && !targetPos.model) {
        targetPos = { model: "shelf-surface", ...targetPos };
      }

      const action = PlanogramActions.addProduct({
        id: uuidv4(),
        sku,
        position: targetPos,
        facings: createFacingConfig(1, 1),
      });

      const validation = session.stage(action);
      if (!validation.valid) {
        toast.error(validation.errors[0]?.message || "Invalid placement");
        return;
      }
    },
    [metadata, session, selectedShelfState],
  );

  const removeProduct = useCallback(
    async (productId: string) => {
      session?.stage(PlanogramActions.removeProduct(productId));
    },
    [session],
  );

  const updateProduct = useCallback(
    async (id: string, updates: Partial<SourceProduct>, silent?: boolean) => {
      if (!session) return;

      const actions: PlanogramAction[] = [];

      if (updates.placement?.position) {
        actions.push(
          PlanogramActions.moveProduct({
            productId: id,
            to: updates.placement.position,
          }),
        );
      }

      if (updates.placement?.facings) {
        actions.push(
          PlanogramActions.updateFacings({
            productId: id,
            facings: updates.placement.facings,
          }),
        );
      }

      if (actions.length === 0) return;

      const method = silent ? session.stageTransient : session.stage;

      if (actions.length === 1) {
        method(actions[0]);
      } else {
        method(PlanogramActions.batch(actions));
      }
    },
    [session],
  );

  const addShelf = useCallback(async () => {
    if (!session) return;
    const current = (fixture?.config.shelves as ShelfConfig[]) || [];
    const maxIdx = current.reduce((m, s) => Math.max(m, s.index), -1);
    const maxH = current.reduce((m, s) => Math.max(m, s.baseHeight), 0);

    session.stage(
      PlanogramActions.addShelf({
        id: generateId(),
        index: (maxIdx + 1) as ShelfIndex,
        baseHeight: (maxH + 300) as Millimeters,
      }),
    );
  }, [session, fixture]);

  const removeShelf = useCallback(
    async (index: number) => {
      if (!session) return;
      const actions: PlanogramAction[] = [
        PlanogramActions.removeShelf(index as ShelfIndex),
      ];

      products.forEach((p) => {
        const pos = p.placement.position;
        if (isShelfSurfacePosition(pos) && pos.shelfIndex === index) {
          actions.push(PlanogramActions.removeProduct(p.id));
        }
      });
      session.stage(PlanogramActions.batch(actions));
    },
    [session, products],
  );

  const updateShelf = useCallback(
    async (index: number, updates: Partial<ShelfConfig>) => {
      session?.stage(
        PlanogramActions.updateShelf({ index: index as ShelfIndex, updates }),
      );
    },
    [session],
  );

  const reindexShelves = useCallback(async () => {
    if (!session) return;
    const current = (fixture?.config.shelves as ShelfConfig[]) || [];
    const sorted = [...current].sort((a, b) => a.baseHeight - b.baseHeight);
    const reindexed = sorted.map((s, i) => ({ ...s, index: i as ShelfIndex }));

    const actions: PlanogramAction[] = [
      PlanogramActions.updateFixture({ config: { shelves: reindexed } }),
    ];
    products.forEach((p) => {
      const pos = p.placement.position;
      if (isShelfSurfacePosition(pos)) {
        const oldShelf = current.find((s) => s.index === pos.shelfIndex);
        const newShelf = reindexed.find((s) => s.id === oldShelf?.id);
        if (newShelf && newShelf.index !== pos.shelfIndex) {
          actions.push(
            PlanogramActions.moveProduct({
              productId: p.id,
              to: {
                ...pos,
                shelfIndex: newShelf.index as ShelfIndex,
              } as SemanticPosition,
            }),
          );
        }
      }
    });
    session.stage(PlanogramActions.batch(actions));
  }, [session, fixture, products]);

  const undo = useCallback(async () => {
    session?.undo();
  }, [session]);

  const redo = useCallback(async () => {
    session?.redo();
  }, [session]);

  const commit = useCallback(async () => {
    if (session) await session.commit();
  }, [session]);

  const wrappedSave = useCallback(async () => {
    await commit();
    await savePlanogram();
  }, [commit, savePlanogram]);

  const createNewPlanogram = useCallback(async () => {
    try {
      const mock = await dal.planograms.getById("mock");
      if (mock) {
        setConfig({
          ...mock,
          id: uuidv4(),
          name: "New Planogram",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        toast.info("Created new planogram");
      }
    } catch (e) {
      toast.error("Failed to create");
    }
  }, [setConfig]);

  const renamePlanogram = useCallback(
    async (name: string) => {
      if (!config) return;
      updateConfig((prev) => ({ ...prev, name }));
      try {
        await dal.planograms.save(config.id, { ...config, name });
        toast.success(`Renamed to ${name}`);
      } catch (e) {
        toast.error("Failed to rename");
      }
    },
    [config, updateConfig],
  );

  const setPlanogramName = useCallback(
    (name: string) => {
      updateConfig((prev) => ({ ...prev, name }));
    },
    [updateConfig],
  );

  const getShelfSpaceUsed = useCallback(
    (index: number) => {
      let used = 0;
      products.forEach((p) => {
        if (
          isShelfSurfacePosition(p.placement.position) &&
          p.placement.position.shelfIndex === index
        ) {
          const meta = metadata?.get(p.sku);
          if (meta) {
            used +=
              meta.dimensions.physical.width *
              (p.placement.facings?.horizontal || 1);
          }
        }
      });
      return used;
    },
    [products, metadata],
  );

  const value: PlanogramEditorContextType = {
    fixture,
    products,
    productMetadata,
    renderInstances,
    snapshot,
    selectedProductId,
    setSelectedProductId,
    selectedShelf: selectedShelfState,
    setSelectedShelf: setSelectedShelfState,
    viewport,
    setViewport,
    zoomAt,
    applyZoom,
    panBy,
    fitToScreen,
    unprojectPoint,
    addProduct,
    removeProduct,
    updateProduct,
    selectProduct,
    addShelf,
    removeShelf,
    updateShelf,
    reindexShelves,
    undo,
    redo,
    canUndo,
    canRedo,
    isProjecting,
    hasUnsavedChanges: dataDirty || (snapshot?.session.actionCount ?? 0) > 0,
    commit,
    planogramName: config?.name || "Untitled",
    setPlanogramName,
    savePlanogram: wrappedSave,
    isSaving,
    createNewPlanogram,
    renamePlanogram,
    savedPlanograms,
    refreshSavedPlanograms,
    getRenderInstances: () => renderInstances,
    getVisibleInstances: () => renderInstances,
    resizeViewport: () => {},
    getShelfSpaceUsed,
    suggestPlacement: (input) => session?.suggestPlacement(input) || null,
    validateIntent: (action) => session?.validate(action) || { valid: false, canRender: false, errors: [], warnings: [] },
  };

  return (
    <PlanogramEditorContext.Provider value={value}>
      {children}
    </PlanogramEditorContext.Provider>
  );
}
