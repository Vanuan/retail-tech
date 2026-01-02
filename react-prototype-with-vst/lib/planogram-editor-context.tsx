"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { usePlanogramData } from "./planogram-data-context";
import {
  SourceProduct,
  ProductMetadata,
  ShelfConfig,
  isShelfSurfacePosition,
  PlanogramConfig,
  ShelfIndex,
  Millimeters,
  createFacingConfig,
  RenderInstance,
} from "./vst/types";

export type { RenderInstance };
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
    products: SourceProduct[],
    ignoreProductId?: string,
  ) => number;

  // Actions
  addProduct: (product: SourceProduct) => void;
  removeProduct: (productId: string) => void;
  updateProduct: (product: SourceProduct) => void;
  selectProduct: (productId: string | null) => void;

  addShelf: () => void;
  removeShelf: (shelfIndex: number) => void;
  updateShelf: (shelfIndex: number, updates: Partial<ShelfConfig>) => void;
  reindexShelves: (shelves: ShelfConfig[]) => ShelfConfig[];

  // Meta/File Operations
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
      // Construct a dummy product for validation
      const product: SourceProduct = {
        id: excludeProductId || "temp",
        sku,
        placement: {
          position,
          facings: createFacingConfig(facings, 1),
        },
      };
      return editor.validatePlacement(product, position, excludeProductId);
    },
    [editor],
  );

  const findNextAvailablePosition = useCallback(
    (sku: string, shelfIndex?: number) => {
      const meta = data.metadata.get(sku);
      if (!meta) return { shelfIndex: 0, x: 0, depth: 0 }; // Fallback
      return (
        editor.findNextAvailablePosition(meta, shelfIndex) || {
          shelfIndex: 0,
          x: 0,
          depth: 0,
        }
      );
    },
    [editor, data.metadata],
  );

  const addProduct = useCallback(
    (sku: string, position?: any) => {
      const meta = data.metadata.get(sku);
      if (!meta) return;

      let finalPos = position;
      if (!finalPos) {
        finalPos = editor.findNextAvailablePosition(
          meta,
          editor.selectedShelf?.index,
        ) || { shelfIndex: 0, x: 0, depth: 0 };
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
      editor.addProduct(newProduct);
    },
    [editor, data.metadata],
  );

  const updateProduct = useCallback(
    (id: string, updates: Partial<SourceProduct>, silent?: boolean) => {
      const p = products.find((p) => p.id === id);
      if (!p) return;
      editor.updateProduct({ ...p, ...updates });
    },
    [products, editor],
  );

  // Missing methods stubbed or mapped
  const resizeViewport = (w: number, h: number) => {}; // No-op, managed by canvas mostly now
  const getVisibleInstances = () => data.renderInstances; // simplified

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
    hasUnsavedChanges: data.hasUnsavedChanges,
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
    addShelf: () => {
      // old addShelf took baseHeight, new one calculates it.
      // We can just call addShelf
      editor.addShelf();
    },
    removeShelf: editor.removeShelf,
    updateShelf: editor.updateShelf,
    insertShelf: editor.addShelf, // simplified
    reindexShelves: () => {
      if (!fixture) return;
      const currentShelves = (fixture.config.shelves as ShelfConfig[]) || [];
      const newShelves = editor.reindexShelves(currentShelves);
      data.updateConfig((prev) => ({
        ...prev,
        fixture: {
          ...prev.fixture,
          config: { ...prev.fixture.config, shelves: newShelves },
        },
      }));
    },

    // Logic
    getShelfSpaceUsed,
    validatePlacement,
    findNextAvailablePosition,

    // Persistence
    savePlanogram: data.savePlanogram,
    loadPlanogram: data.loadPlanogram,
    createNewPlanogram: editor.createNewPlanogram,
    renamePlanogram: editor.renamePlanogram,

    // Direct access
    getRenderInstances: () => data.renderInstances,
  };
}

export function PlanogramEditorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { config, metadata, updateConfig, savePlanogram, setConfig } =
    usePlanogramData();

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
      products: SourceProduct[],
      ignoreProductId?: string,
    ) => {
      const productsOnShelf = products.filter((p) => {
        if (p.id === ignoreProductId) return false;
        if (!isShelfSurfacePosition(p.placement.position)) return false;
        return p.placement.position.shelfIndex === shelfIndex;
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
    [metadata],
  );

  const validatePlacement = useCallback(
    (product: SourceProduct, position: any, ignoreProductId?: string) => {
      if (!config) return { valid: false, error: "No config" };

      // Simple validation for shelf surface
      if (!isShelfSurfacePosition(position)) return { valid: true };

      const meta = metadata.get(product.sku);
      if (!meta) return { valid: false, error: "Metadata missing" };

      const shelfIndex = position.shelfIndex;
      // Find shelf
      const shelves = (config.fixture.config.shelves as ShelfConfig[]) || [];
      const shelf = shelves.find((s) => s.index === shelfIndex);
      if (!shelf) return { valid: false, error: "Shelf not found" };

      const startX = position.x;
      const facings = product.placement.facings?.horizontal || 1;
      const width = meta.dimensions.physical.width * facings;
      const endX = startX + width;
      const shelfWidth = config.fixture.dimensions.width;

      if (startX < 0 || endX > shelfWidth) {
        return { valid: false, error: "Out of bounds" };
      }

      // Overlap
      const collision = config.products.some((p) => {
        if (p.id === product.id || p.id === ignoreProductId) return false;
        if (!isShelfSurfacePosition(p.placement.position)) return false;
        if (p.placement.position.shelfIndex !== shelfIndex) return false;
        if ((p.placement.position.depth || 0) !== (position.depth || 0))
          return false;

        const pMeta = metadata.get(p.sku);
        if (!pMeta) return false;

        const pX = p.placement.position.x;
        const pW =
          pMeta.dimensions.physical.width *
          (p.placement.facings?.horizontal || 1);
        const pEnd = pX + pW;

        return startX < pEnd && endX > pX;
      });

      if (collision) {
        return { valid: false, error: "Collision" };
      }

      return { valid: true, spaceUsed: endX };
    },
    [config, metadata],
  );

  const findNextAvailablePosition = useCallback(
    (prodMetadata: ProductMetadata, preferredShelfIndex?: number) => {
      if (!config) return null;

      const rawShelves = (config.fixture.config.shelves as ShelfConfig[]) || [];
      const shelves = [...rawShelves].sort((a, b) => a.index - b.index);

      // prioritize preferred
      if (preferredShelfIndex !== undefined) {
        const idx = shelves.findIndex((s) => s.index === preferredShelfIndex);
        if (idx > 0) {
          const [s] = shelves.splice(idx, 1);
          shelves.unshift(s);
        }
      }

      const pWidth = prodMetadata.dimensions.physical.width;
      const shelfWidth = config.fixture.dimensions.width;

      for (const shelf of shelves) {
        const used = getShelfSpaceUsed(shelf.index, config.products);
        if (used + pWidth <= shelfWidth) {
          return { shelfIndex: shelf.index, x: used, depth: 0 };
        }
      }
      return null;
    },
    [config, getShelfSpaceUsed],
  );

  // --- Mutations ---

  const addProduct = useCallback(
    (product: SourceProduct) => {
      updateConfig((prev) => ({
        ...prev,
        products: [...prev.products, product],
      }));
      setSelectedProductId(product.id);
    },
    [updateConfig],
  );

  const removeProduct = useCallback(
    (id: string) => {
      updateConfig((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== id),
      }));
      if (selectedProductId === id) setSelectedProductId(null);
    },
    [updateConfig, selectedProductId],
  );

  const updateProduct = useCallback(
    (product: SourceProduct) => {
      updateConfig((prev) => ({
        ...prev,
        products: prev.products.map((p) => (p.id === product.id ? product : p)),
      }));
    },
    [updateConfig],
  );

  const selectProduct = useCallback((id: string | null) => {
    setSelectedProductId(id);
    if (id) setSelectedShelf(null);
  }, []);

  const addShelf = useCallback(() => {
    updateConfig((prev) => {
      const currentShelves =
        (prev.fixture.config.shelves as ShelfConfig[]) || [];
      const maxIdx = currentShelves.reduce(
        (acc, s) => Math.max(acc, s.index),
        -1,
      );
      const newShelf: ShelfConfig = {
        id: generateId(),
        index: (maxIdx + 1) as ShelfIndex,
        baseHeight: 300 as Millimeters,
      };
      const newShelves = [...currentShelves, newShelf];
      return {
        ...prev,
        fixture: {
          ...prev.fixture,
          config: {
            ...prev.fixture.config,
            shelves: newShelves,
          },
        },
      };
    });
  }, [updateConfig]);

  const removeShelf = useCallback(
    (index: number) => {
      updateConfig((prev) => {
        // Remove shelf
        const currentShelves =
          (prev.fixture.config.shelves as ShelfConfig[]) || [];
        const shelves = currentShelves.filter((s) => s.index !== index);

        // Remove products on shelf
        const products = prev.products.filter((p) => {
          if (isShelfSurfacePosition(p.placement.position)) {
            return p.placement.position.shelfIndex !== index;
          }
          return true;
        });
        return {
          ...prev,
          products,
          fixture: {
            ...prev.fixture,
            config: {
              ...prev.fixture.config,
              shelves,
            },
          },
        };
      });
      setSelectedShelf(null);
    },
    [updateConfig],
  );

  const updateShelf = useCallback(
    (index: number, updates: Partial<ShelfConfig>) => {
      updateConfig((prev) => {
        const currentShelves =
          (prev.fixture.config.shelves as ShelfConfig[]) || [];
        return {
          ...prev,
          fixture: {
            ...prev.fixture,
            config: {
              ...prev.fixture.config,
              shelves: currentShelves.map((s) =>
                s.index === index ? { ...s, ...updates } : s,
              ),
            },
          },
        };
      });
    },
    [updateConfig],
  );

  const reindexShelves = useCallback((shelves: ShelfConfig[]) => {
    return shelves.map((s, i) => ({ ...s, index: i as ShelfIndex }));
  }, []);

  // --- Meta Actions ---

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
