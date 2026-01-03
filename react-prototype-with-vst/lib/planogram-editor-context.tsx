"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { usePlanogramData } from "./planogram-data-context";
import {
  SourceProduct,
  ProductMetadata,
  ShelfConfig,
  PlanogramConfig,
  ShelfIndex,
  Millimeters,
  RenderInstance,
} from "@vst/vocabulary-types";
import { isShelfSurfacePosition, createFacingConfig } from "@vst/utils";

export type { RenderInstance };
import {
  SessionStore,
  CoreSequenceRoller,
  usePlanogramSession,
} from "@vst/session";
import { CoreProcessor } from "./vst/implementations/core/processor";
import { dal } from "./vst/implementations/repositories/data-access";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

// Generate a simple ID if uuid is not available, or use random
const generateId = () => Math.random().toString(36).substring(2, 9);

interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

interface PlanogramEditorContextType {
  // Selection
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  selectedShelf: { id: string; index: number } | null;
  setSelectedShelf: (shelf: { id: string; index: number } | null) => void;

  // Viewport
  viewport: ViewportState;
  setViewport: (v: ViewportState) => void;
  zoomAt: (x: number, y: number, delta: number) => void;
  panBy: (dx: number, dy: number) => void;
  fitToScreen: (width: number, height: number) => void;
  unprojectPoint: (x: number, y: number) => { x: number; y: number; z: number };

  // Logic
  validatePlacement: (
    product: SourceProduct,
    position: any,
    ignoreProductId?: string,
  ) => { valid: boolean; error?: string; spaceUsed?: number };

  findNextAvailablePosition: (
    metadata: ProductMetadata,
    preferredShelfIndex?: number,
  ) => { shelfIndex: number; x: number; depth: number } | null;

  getShelfSpaceUsed: (
    shelfIndex: number,
    products: readonly SourceProduct[],
    ignoreProductId?: string,
  ) => number;

  // Actions
  addProduct: (product: SourceProduct) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  updateProduct: (
    id: string,
    updates: Partial<SourceProduct>,
    silent?: boolean,
  ) => Promise<void>;
  selectProduct: (productId: string | null) => void;

  addShelf: () => void;
  removeShelf: (shelfIndex: number) => void;
  updateShelf: (
    shelfIndex: number,
    updates: Partial<ShelfConfig>,
  ) => Promise<void>;
  reindexShelves: (shelves: ShelfConfig[]) => ShelfConfig[];
  reindexShelvesAction: () => Promise<void>;

  // Data State
  renderInstances: RenderInstance[];
  snapshot: any;

  // Session Actions
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  isProjecting: boolean;

  // Meta/File Operations
  savePlanogram: () => Promise<void>;
  commit: () => Promise<void>;
  savedPlanograms: PlanogramConfig[];
  refreshSavedPlanograms: () => Promise<void>;
  createNewPlanogram: () => Promise<void>;
  renamePlanogram: (name: string) => Promise<void>;
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

/**
 * Backward compatibility hook.
 * Mimics the API of the original usePlanogram hook by composing Data and Editor contexts.
 */
export function usePlanogram() {
  const data = usePlanogramData();
  const editor = usePlanogramEditor();

  // Compat wrappers
  const fixture = data.config?.fixture || null;
  const products = data.config?.products || [];

  // Convert Map to Record for compatibility
  const productMetadata: Record<string, ProductMetadata> = {};
  data.metadata.forEach((value, key) => {
    productMetadata[key] = value;
  });

  const selectedShelfIndex = editor.selectedShelf?.index ?? 0;

  const setSelectedShelf = useCallback(
    (idx: number | ((prev: number) => number)) => {
      if (!fixture) return;
      const val = typeof idx === "function" ? idx(selectedShelfIndex) : idx;
      const shelves = (fixture.config.shelves as ShelfConfig[]) || [];
      const shelf = shelves.find((s) => s.index === val);
      if (shelf) {
        editor.setSelectedShelf({ id: shelf.id, index: shelf.index });
      } else {
        // Fallback if shelf not found (e.g. index 0 default)
        editor.setSelectedShelf({ id: "unknown", index: val });
      }
    },
    [editor, fixture, selectedShelfIndex],
  );

  const setPlanogramName = useCallback(
    (name: string) => {
      data.updateConfig((prev) => ({ ...prev, name }));
    },
    [data],
  );

  const applyZoom = useCallback(
    (factor: number) => {
      // Zoom relative to center? We need access to screen dimensions, roughly.
      // For now, just zoom at 0,0 or center of viewport logic in zoomAt
      // The original applyZoom used zoomCenter which used the viewport center.
      // We'll approximate by just scaling the zoom level directly or using zoomAt with a dummy point.
      // Actually zoomAt takes delta (logarithmic). Factor 1.2 is roughly delta 180.
      // Let's implement a direct zoom multiplier in the context or just fake it.
      // We'll manually update viewport state here since we have setViewport.
      editor.setViewport({
        ...editor.viewport,
        zoom: editor.viewport.zoom * factor,
      });
    },
    [editor],
  );

  // Wrappers for simpler signatures
  const getShelfSpaceUsed = useCallback(
    (index: number) => editor.getShelfSpaceUsed(index, products),
    [editor, products],
  );

  const validatePlacement = useCallback(
    (
      sku: string,
      position: any,
      facings: number,
      excludeProductId?: string,
    ) => {
      const pos = { ...position };
      if (!pos.model) pos.model = "shelf-surface";

      // Construct a dummy product for validation
      const product: SourceProduct = {
        id: excludeProductId || "temp",
        sku,
        placement: {
          position: pos,
          facings: createFacingConfig(facings, 1),
        },
      };
      return editor.validatePlacement(product, pos, excludeProductId);
    },
    [editor],
  );

  const findNextAvailablePosition = useCallback(
    (sku: string, shelfIndex?: number) => {
      const meta = data.metadata.get(sku);
      if (!meta)
        return { model: "shelf-surface", shelfIndex: 0, x: 0, depth: 0 }; // Fallback
      return (
        editor.findNextAvailablePosition(meta, shelfIndex) || {
          model: "shelf-surface",
          shelfIndex: 0,
          x: 0,
          depth: 0,
        }
      );
    },
    [editor, data.metadata],
  );

  const addProduct = useCallback(
    async (sku: string, position?: any) => {
      const meta = data.metadata.get(sku);
      if (!meta) return;

      let finalPos = { ...position };
      if (!position || position.x === undefined) {
        const autoPos = editor.findNextAvailablePosition(
          meta,
          position?.shelfIndex ?? editor.selectedShelf?.index,
        );
        if (autoPos) {
          finalPos = { ...finalPos, ...autoPos };
        } else {
          finalPos = {
            model: "shelf-surface",
            shelfIndex: position?.shelfIndex ?? 0,
            x: 0,
            depth: 0,
            ...finalPos,
          };
        }
      }
      if (!finalPos.model) finalPos.model = "shelf-surface";

      // Check validation before adding
      const validation = validatePlacement(sku, finalPos, 1);
      if (!validation.valid) {
        toast.error(`Cannot add product: ${validation.error}`);
        return;
      }

      const newProduct: SourceProduct = {
        id: uuidv4(),
        sku,
        placement: {
          position: {
            ...finalPos,
            shelfIndex: finalPos.shelfIndex as ShelfIndex,
          },
          facings: createFacingConfig(1, 1),
        },
      };
      await editor.addProduct(newProduct);
    },
    [data.metadata, findNextAvailablePosition, validatePlacement, editor],
  );

  const updateProduct = useCallback(
    async (id: string, updates: Partial<SourceProduct>, silent?: boolean) => {
      await editor.updateProduct(id, updates, silent);
    },
    [editor.updateProduct],
  );

  // Missing methods stubbed or mapped
  const resizeViewport = (w: number, h: number) => {}; // No-op, managed by canvas mostly now
  const getVisibleInstances = () => editor.renderInstances;

  return {
    // Data
    fixture,
    products,
    productMetadata,
    planogramId: data.config?.id || "",
    planogramName: data.config?.name || "Untitled",
    setPlanogramName,
    isLoading: data.isLoading,
    isSaving: data.isSaving,
    hasUnsavedChanges:
      data.hasUnsavedChanges || editor.snapshot?.session?.isDirty || false,
    error: data.error ? data.error.message : null,
    savedPlanograms: editor.savedPlanograms,

    // Selection
    selectedProductId: editor.selectedProductId,
    selectProduct: editor.selectProduct,
    selectedShelf: selectedShelfIndex,
    setSelectedShelf,

    // Viewport
    viewport: {
      type: "orthographic" as const,
      ppi: 1,
      zoom: editor.viewport.zoom,
      offset: { x: editor.viewport.x, y: editor.viewport.y, z: 0 },
    },
    zoomAt: (point: { x: number; y: number }, factor: number) => {
      // adapt vector2 to x,y
      // factor conversion needed? original zoomAt took factor (e.g. 1.1)
      // new zoomAt takes delta.
      // Let's just use direct setViewport for compatibility if needed or adapt
      // We will approximate: log(factor) / log(1.001)
      const delta = Math.log(factor) / Math.log(1.001);
      editor.zoomAt(point.x, point.y, delta);
    },
    applyZoom,
    panBy: (delta: { x: number; y: number }) => editor.panBy(delta.x, delta.y),
    fitToScreen: editor.fitToScreen,
    resizeViewport,
    unprojectPoint: (p: { x: number; y: number }) =>
      editor.unprojectPoint(p.x, p.y),
    getVisibleInstances,

    // Actions
    addProduct,
    removeProduct: editor.removeProduct,
    updateProduct,
    addShelf: editor.addShelf,
    removeShelf: editor.removeShelf,
    updateShelf: editor.updateShelf,
    insertShelf: editor.addShelf,
    reindexShelves: editor.reindexShelvesAction,

    // Logic
    getShelfSpaceUsed,
    validatePlacement,
    findNextAvailablePosition,

    // Persistence
    savePlanogram: editor.savePlanogram,
    loadPlanogram: data.loadPlanogram,
    createNewPlanogram: editor.createNewPlanogram,
    renamePlanogram: editor.renamePlanogram,

    undo: editor.undo,
    redo: editor.redo,
    canUndo: editor.canUndo,
    canRedo: editor.canRedo,
    isProjecting: editor.isProjecting,
    snapshot: editor.snapshot,
    validation: editor.snapshot?.validation || null,
    commit: editor.commit,

    getRenderInstances: () => editor.renderInstances,
  };
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
  } = usePlanogramData();

  // --- Session Management ---
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);
  const processor = useMemo(() => new CoreProcessor(dal), []);
  const roller = useRef(new CoreSequenceRoller(processor, metadata));

  // Keep roller dependencies in sync
  useEffect(() => {
    const r = roller.current as any;
    r.processor = processor;
    r.metadata = metadata;
  }, [processor, metadata]);

  // Initialize session store when config is loaded or changed
  useEffect(() => {
    if (config) {
      setSessionStore(new SessionStore(config, roller.current));
    }
  }, [config?.id]);

  const { snapshot, dispatch, undo, redo, canUndo, canRedo, isProjecting } =
    usePlanogramSession(sessionStore);

  // Sync session changes back to the data layer for persistence/rendering
  useEffect(() => {
    if (snapshot) {
      setConfig(snapshot.config);
    }
  }, [snapshot, setConfig]);

  const renderInstances = snapshot?.renderInstances || dataRenderInstances;

  // --- Selection State ---
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [selectedShelf, setSelectedShelf] = useState<{
    id: string;
    index: number;
  } | null>(null);

  // --- Viewport State ---
  const [viewport, setViewport] = useState<ViewportState>({
    x: 0,
    y: 0,
    zoom: 1,
  });

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

  // Viewport Logic
  const zoomAt = useCallback((x: number, y: number, delta: number) => {
    setViewport((prev) => {
      const zoomFactor = Math.pow(1.001, delta);
      const newZoom = Math.max(0.1, Math.min(prev.zoom * zoomFactor, 10));

      // Calculate offset to keep (x,y) stable
      // worldX = (screenX - offset.x) / zoom
      // worldX should be same before and after
      const worldX = (x - prev.x) / prev.zoom;
      const worldY = (y - prev.y) / prev.zoom;

      const newX = x - worldX * newZoom;
      const newY = y - worldY * newZoom;

      return { x: newX, y: newY, zoom: newZoom };
    });
  }, []);

  const panBy = useCallback((dx: number, dy: number) => {
    setViewport((prev) => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));
  }, []);

  const fitToScreen = useCallback(
    (width: number, height: number) => {
      if (!config) return;

      const fixtureW = config.fixture.dimensions.width;
      const fixtureH = config.fixture.dimensions.height;
      const padding = 40;

      const availableW = width - padding * 2;
      const availableH = height - padding * 2;

      const scaleX = availableW / fixtureW;
      const scaleY = availableH / fixtureH;
      const scale = Math.min(scaleX, scaleY);

      // Center
      const drawnW = fixtureW * scale;
      const drawnH = fixtureH * scale;
      const offsetX = (width - drawnW) / 2;
      const offsetY = (height - drawnH) / 2;

      setViewport({
        x: offsetX,
        y: offsetY,
        zoom: scale,
      });
    },
    [config],
  );

  const unprojectPoint = useCallback(
    (x: number, y: number) => {
      // Screen -> World
      // screen = world * zoom + offset
      // world = (screen - offset) / zoom
      return {
        x: (x - viewport.x) / viewport.zoom,
        y: (y - viewport.y) / viewport.zoom,
        z: 0,
      };
    },
    [viewport],
  );

  // --- Logic Helpers ---

  const getShelfSpaceUsed = useCallback(
    (
      shelfIndex: number,
      products: readonly SourceProduct[],
      ignoreProductId?: string,
    ) => {
      const activeProducts = snapshot?.config.products || products;
      const productsOnShelf = activeProducts.filter((p) => {
        if (p.id === ignoreProductId) return false;
        if (!isShelfSurfacePosition(p.placement.position)) return false;
        const pos = p.placement.position;
        return (
          pos.shelfIndex === shelfIndex &&
          typeof pos.x === "number" &&
          !isNaN(pos.x)
        );
      });

      let maxX = 0;
      productsOnShelf.forEach((p) => {
        if (!isShelfSurfacePosition(p.placement.position)) return;
        const meta = metadata.get(p.sku);
        if (!meta) return;

        const pos = p.placement.position;
        const startX = pos.x;
        const facings = p.placement.facings?.horizontal || 1;
        const productWidth = meta.dimensions.physical.width;
        const endX = startX + facings * productWidth;

        if (endX > maxX) maxX = endX;
      });
      return maxX;
    },
    [metadata, snapshot],
  );

  const validatePlacement = useCallback(
    (product: SourceProduct, position: any, ignoreProductId?: string) => {
      const activeConfig = snapshot?.config || config;
      if (!activeConfig) return { valid: false, error: "No config" };

      // Simple validation for shelf surface
      if (!isShelfSurfacePosition(position)) return { valid: true };

      // Ensure we have valid numbers for coordinates
      if (typeof position.x !== "number" || isNaN(position.x)) {
        return { valid: false, error: "Invalid X coordinate" };
      }

      const meta = metadata.get(product.sku);
      if (!meta) return { valid: false, error: "Metadata missing" };

      const shelfIndex = position.shelfIndex;
      // Find shelf
      const shelves =
        (activeConfig.fixture.config.shelves as ShelfConfig[]) || [];
      const shelf = shelves.find((s) => s.index === shelfIndex);
      if (!shelf) return { valid: false, error: "Shelf not found" };

      const startX = Math.round(position.x * 1000) / 1000;
      const facings = product.placement.facings?.horizontal || 1;
      const width = meta.dimensions.physical.width * facings;
      const endX = Math.round((startX + width) * 1000) / 1000;
      const shelfWidth = activeConfig.fixture.dimensions.width;

      if (startX < -0.1 || endX > shelfWidth + 0.1) {
        return { valid: false, error: "Out of bounds" };
      }

      // Overlap
      const collision = activeConfig.products.some((p) => {
        if (p.id === product.id || p.id === ignoreProductId) return false;
        if (!isShelfSurfacePosition(p.placement.position)) return false;
        if (p.placement.position.shelfIndex !== shelfIndex) return false;
        if ((p.placement.position.depth || 0) !== (position.depth || 0))
          return false;

        const pMeta = metadata.get(p.sku);
        if (!pMeta) return false;

        const pX = Math.round(p.placement.position.x * 1000) / 1000;
        const pW =
          pMeta.dimensions.physical.width *
          (p.placement.facings?.horizontal || 1);
        const pEnd = Math.round((pX + pW) * 1000) / 1000;

        return startX < pEnd - 0.5 && endX > pX + 0.5;
      });

      if (collision) {
        return { valid: false, error: "Collision" };
      }

      return { valid: true, spaceUsed: endX };
    },
    [config, metadata, snapshot],
  );

  const findNextAvailablePosition = useCallback(
    (metadata: ProductMetadata, preferredShelfIndex?: number) => {
      const activeConfig = snapshot?.config || config;
      if (!activeConfig) return null;

      const rawShelves =
        (activeConfig.fixture.config.shelves as ShelfConfig[]) || [];
      const shelves = [...rawShelves].sort((a, b) => b.index - a.index);

      // Try preferred shelf first
      if (preferredShelfIndex !== undefined) {
        const idx = shelves.findIndex((s) => s.index === preferredShelfIndex);
        if (idx !== -1) {
          const s = shelves[idx];
          shelves.splice(idx, 1);
          shelves.unshift(s);
        }
      }

      const pWidth = metadata.dimensions.physical.width;
      const shelfWidth = activeConfig.fixture.dimensions.width;

      for (const shelf of shelves) {
        const used = getShelfSpaceUsed(shelf.index, activeConfig.products);
        if (used + pWidth <= shelfWidth) {
          return {
            model: "shelf-surface" as const,
            shelfIndex: shelf.index,
            x: used as any,
            depth: 0 as any,
          };
        }
      }
      return null;
    },
    [config, getShelfSpaceUsed, snapshot],
  );

  // --- Mutations ---

  const addProduct = useCallback(
    async (product: SourceProduct) => {
      await dispatch({ type: "PRODUCT_ADD", product });
    },
    [dispatch],
  );

  const removeProduct = useCallback(
    async (productId: string) => {
      await dispatch({ type: "PRODUCT_REMOVE", productId });
    },
    [dispatch],
  );

  const updateProduct = useCallback(
    async (id: string, updates: Partial<SourceProduct>, silent?: boolean) => {
      const method =
        silent && sessionStore
          ? sessionStore.dispatchSquashed.bind(sessionStore)
          : dispatch;

      await method({
        type: "PRODUCT_UPDATE",
        productId: id,
        to: updates.placement?.position,
        facings: updates.placement?.facings,
      });
    },
    [dispatch, sessionStore],
  );

  const selectProduct = useCallback(
    (id: string | null) => {
      setSelectedProductId(id);
      if (id) {
        setSelectedShelf(null);
        sessionStore?.setSelection([id]);
      } else {
        sessionStore?.setSelection([]);
      }
    },
    [sessionStore],
  );

  const addShelf = useCallback(async () => {
    if (!snapshot) return;
    const currentShelves =
      (snapshot.config.fixture.config.shelves as ShelfConfig[]) || [];
    const maxIdx = currentShelves.reduce(
      (acc, s) => Math.max(acc, s.index),
      -1,
    );
    const maxHeight = currentShelves.reduce(
      (acc, s) => Math.max(acc, s.baseHeight as number),
      0,
    );

    const newShelf: ShelfConfig = {
      id: generateId(),
      index: (maxIdx + 1) as ShelfIndex,
      baseHeight: (maxHeight + 300) as Millimeters,
    };

    await dispatch({
      type: "FIXTURE_UPDATE",
      config: {
        shelves: [...currentShelves, newShelf],
      },
    });
  }, [dispatch, snapshot]);

  const removeShelf = useCallback(
    async (index: number) => {
      if (!snapshot) return;
      const currentShelves =
        (snapshot.config.fixture.config.shelves as ShelfConfig[]) || [];
      const shelves = currentShelves.filter((s) => s.index !== index);

      const actions: any[] = [
        {
          type: "FIXTURE_UPDATE",
          config: { shelves },
        },
      ];

      // Remove products on that shelf via individual actions or a batch if we supported it
      // For now, the projector's applyRemove or similar logic is for products
      snapshot.config.products.forEach((p: SourceProduct) => {
        if (
          isShelfSurfacePosition(p.placement.position) &&
          p.placement.position.shelfIndex === index
        ) {
          actions.push({ type: "PRODUCT_REMOVE", productId: p.id });
        }
      });

      await dispatch({
        type: "BATCH",
        actions,
      } as any);

      setSelectedShelf(null);
    },
    [dispatch, snapshot],
  );

  const updateShelf = useCallback(
    async (index: number, updates: Partial<ShelfConfig>) => {
      if (!snapshot) return;
      const currentShelves =
        (snapshot.config.fixture.config.shelves as ShelfConfig[]) || [];

      await dispatch({
        type: "FIXTURE_UPDATE",
        config: {
          shelves: currentShelves.map((s) =>
            s.index === index ? { ...s, ...updates } : s,
          ),
        },
      });
    },
    [dispatch, snapshot],
  );

  const reindexShelves = useCallback((shelves: ShelfConfig[]) => {
    return shelves
      .sort((a, b) => (a.baseHeight as number) - (b.baseHeight as number))
      .map((s, i) => ({ ...s, index: i as ShelfIndex }));
  }, []);

  const reindexShelvesAction = useCallback(async () => {
    if (!snapshot) return;
    const currentShelves =
      (snapshot.config.fixture.config.shelves as ShelfConfig[]) || [];
    const newShelves = reindexShelves(currentShelves);

    // Map products to new indices based on height
    const actions: any[] = [
      {
        type: "FIXTURE_UPDATE",
        config: { shelves: newShelves },
      },
    ];

    snapshot.config.products.forEach((p: SourceProduct) => {
      if (isShelfSurfacePosition(p.placement.position)) {
        const oldIndex = p.placement.position.shelfIndex;
        const oldShelf = currentShelves.find((s) => s.index === oldIndex);
        if (oldShelf) {
          const newShelf = newShelves.find((s) => s.id === oldShelf.id);
          if (newShelf && newShelf.index !== oldIndex) {
            actions.push({
              type: "PRODUCT_UPDATE",
              productId: p.id,
              to: { ...p.placement.position, shelfIndex: newShelf.index },
            });
          }
        }
      }
    });

    await dispatch({
      type: "BATCH",
      actions,
    } as any);
  }, [dispatch, snapshot, reindexShelves]);

  // --- Meta Actions ---

  const commit = useCallback(async () => {
    if (sessionStore) {
      await sessionStore.commit();
    }
  }, [sessionStore]);

  const wrappedSavePlanogram = useCallback(async () => {
    // Swapping the order: commit the session history first, then save the resulting config.
    // This ensures that the data-layer's hasUnsavedChanges flag is correctly reset to false
    // after the session-sync effect has finished marking it as dirty.
    await commit();
    await savePlanogram();
  }, [savePlanogram, commit]);

  const createNewPlanogram = useCallback(async () => {
    // Load 'mock' as template or empty
    try {
      const mock = await dal.planograms.getById("mock");
      if (mock) {
        const newConfig: PlanogramConfig = {
          ...mock,
          id: uuidv4(),
          name: "New Planogram",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setConfig(newConfig);
        setSelectedProductId(null);
        setSelectedShelf(null);
        toast.info("Created new planogram");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to create new planogram");
    }
  }, [setConfig]);

  const renamePlanogram = useCallback(
    async (name: string) => {
      if (!config) return;
      // Optimistic update
      updateConfig((prev) => ({ ...prev, name }));
      // Save
      // Ideally we save with new name.
      // We rely on savePlanogram from data context which uses current config.
      // But we should probably await the save here.
      // Since updateConfig updates state, we might need to wait for render or use the functional update result in save.
      // But savePlanogram uses 'config' from state, which might be stale in this closure.
      // Actually savePlanogram in DataContext uses config from state.
      // To ensure consistency, we might need to save explicitly or just let the user hit save.
      // But original renamePlanogram did save.
      // We'll trust the user to hit save or trigger it.
      // Or we can invoke dal directly.
      try {
        await dal.planograms.save(config.id, { ...config, name });
        refreshSavedPlanograms();
        toast.success(`Renamed to ${name}`);
      } catch (e) {
        toast.error("Failed to rename");
      }
    },
    [config, updateConfig, refreshSavedPlanograms],
  );

  const value = {
    selectedProductId,
    setSelectedProductId,
    selectedShelf,
    setSelectedShelf,
    viewport,
    setViewport,
    zoomAt,
    panBy,
    fitToScreen,
    unprojectPoint,
    validatePlacement,
    findNextAvailablePosition,
    getShelfSpaceUsed,
    addProduct,
    removeProduct,
    updateProduct,
    selectProduct,
    addShelf,
    removeShelf,
    updateShelf,
    reindexShelves,
    reindexShelvesAction,
    renderInstances,
    snapshot,
    undo,
    redo,
    canUndo,
    canRedo,
    isProjecting,
    savePlanogram: wrappedSavePlanogram,
    commit,
    savedPlanograms,
    refreshSavedPlanograms,
    createNewPlanogram,
    renamePlanogram,
  };

  return (
    <PlanogramEditorContext.Provider value={value}>
      {children}
    </PlanogramEditorContext.Provider>
  );
}
