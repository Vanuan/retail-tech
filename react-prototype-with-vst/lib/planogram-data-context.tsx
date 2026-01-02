"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  PlanogramConfig,
  RenderInstance,
  ProductMetadata,
} from "@/lib/vst/types";
import { CoreProcessor } from "@/lib/vst/implementations/core/processor";
import { dal } from "@/lib/vst/implementations/repositories/data-access";

interface PlanogramDataContextType {
  // Data State
  config: PlanogramConfig | null;
  renderInstances: RenderInstance[];
  metadata: Map<string, ProductMetadata>;

  // Status
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  hasUnsavedChanges: boolean;

  // Actions
  loadPlanogram: (id: string) => Promise<void>;
  savePlanogram: () => Promise<void>;
  updateConfig: (updater: (prev: PlanogramConfig) => PlanogramConfig) => void;
  setConfig: (config: PlanogramConfig) => void;
  refreshProcessing: () => void;
}

const PlanogramDataContext = createContext<PlanogramDataContextType | null>(
  null,
);

export function usePlanogramData() {
  const context = useContext(PlanogramDataContext);
  if (!context) {
    throw new Error(
      "usePlanogramData must be used within a PlanogramDataProvider",
    );
  }
  return context;
}

interface PlanogramDataProviderProps {
  planogramId?: string;
  initialConfig?: PlanogramConfig;
  children: React.ReactNode;
}

export function PlanogramDataProvider({
  planogramId,
  initialConfig,
  children,
}: PlanogramDataProviderProps) {
  const [config, _setConfig] = useState<PlanogramConfig | null>(
    initialConfig || null,
  );
  const [renderInstances, setRenderInstances] = useState<RenderInstance[]>([]);
  const [metadata, setMetadata] = useState<Map<string, ProductMetadata>>(
    new Map(),
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Use a ref for metadata to access current value in async functions without closure staleness
  const metadataRef = useRef(metadata);
  useEffect(() => {
    metadataRef.current = metadata;
  }, [metadata]);

  // Core Processor instance
  const processor = useMemo(() => new CoreProcessor(dal), []);

  // Process data (synchronous wrapper)
  const processConfig = useCallback(
    (cfg: PlanogramConfig, meta: Map<string, ProductMetadata>) => {
      try {
        const result = processor.processSync(cfg, meta);
        setRenderInstances(result.renderInstances);
      } catch (e) {
        console.error("Processing error", e);
        // We might want to set a non-blocking error state here
      }
    },
    [processor],
  );

  // Helper to ensure we have metadata for the current config
  const ensureMetadata = useCallback(async (cfg: PlanogramConfig) => {
    const currentMeta = metadataRef.current;
    const missingSkus = new Set<string>();

    cfg.products.forEach((p) => {
      if (!currentMeta.has(p.sku)) {
        missingSkus.add(p.sku);
      }
    });

    if (missingSkus.size === 0) return currentMeta;

    // Fetch missing
    const newMetadata = new Map(currentMeta);
    let hasUpdates = false;

    // In a real app, dal.products.getMany(skus) would be better
    await Promise.all(
      Array.from(missingSkus).map(async (sku) => {
        try {
          const meta = await dal.products.getBySku(sku);
          if (meta) {
            newMetadata.set(sku, meta);
            hasUpdates = true;
          }
        } catch (err) {
          console.error(`Failed to fetch metadata for SKU ${sku}`, err);
        }
      }),
    );

    if (hasUpdates) {
      setMetadata(newMetadata);
      return newMetadata;
    }
    return currentMeta;
  }, []);

  const loadPlanogram = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await dal.initialize();
        const loadedConfig = await dal.planograms.getById(id);
        if (!loadedConfig) throw new Error(`Planogram ${id} not found`);

        const loadedMetadata = await ensureMetadata(loadedConfig);

        _setConfig(loadedConfig);
        setHasUnsavedChanges(false);
        processConfig(loadedConfig, loadedMetadata);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err : new Error("Failed to load planogram"),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [ensureMetadata, processConfig],
  );

  const savePlanogram = useCallback(async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      await dal.planograms.save(config.id, config);
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to save planogram"),
      );
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [config]);

  // Update Config Wrappers
  const updateConfig = useCallback(
    (updater: (prev: PlanogramConfig) => PlanogramConfig) => {
      _setConfig((prev) => {
        if (!prev) return null;
        const newConfig = updater(prev);
        setHasUnsavedChanges(true);
        return newConfig;
      });
    },
    [],
  );

  const setConfig = useCallback((newConfig: PlanogramConfig) => {
    _setConfig(newConfig);
    setHasUnsavedChanges(true);
  }, []);

  const refreshProcessing = useCallback(() => {
    if (config) {
      processConfig(config, metadataRef.current);
    }
  }, [config, processConfig]);

  // Effect: React to config or metadata changes to keep renderInstances in sync
  useEffect(() => {
    if (!config) return;

    let mounted = true;

    const run = async () => {
      // 1. Process immediately with what we have (Responsive UI)
      processConfig(config, metadataRef.current);

      // 2. Fetch any missing metadata
      const updatedMeta = await ensureMetadata(config);

      // 3. If metadata changed, re-process
      if (mounted && updatedMeta !== metadataRef.current) {
        processConfig(config, updatedMeta);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [config, metadata, ensureMetadata, processConfig]);

  // Initial load effect
  useEffect(() => {
    if (planogramId && !config && !isLoading) {
      loadPlanogram(planogramId);
    }
  }, [planogramId, config, isLoading, loadPlanogram]);

  const value = {
    config,
    renderInstances,
    metadata,
    isLoading,
    isSaving,
    error,
    hasUnsavedChanges,
    loadPlanogram,
    savePlanogram,
    updateConfig,
    setConfig,
    refreshProcessing,
  };

  return (
    <PlanogramDataContext.Provider value={value}>
      {children}
    </PlanogramDataContext.Provider>
  );
}
