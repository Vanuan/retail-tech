### **Reconciled Architecture Diagram and Responsibilities:**

```
COMPLETE V2.2 DIGITAL TWIN ARCHITECTURE
=======================================

LAYER 1: DATA LAYER (SOURCE OF TRUTH)
├─ FixtureRegistry                    ← Physical structure definitions
├─ PlacementModelRegistry             ← Spatial logic strategies  
├─ AssetManager                       ← Sprite, mask, background assets
├─ PlanogramConfig                    ← Semantic "retail truths"
├─ METADATASTORE                      ← Physical dimensions, anchors, SKU data
├─ PerformanceMetrics                 ← Sales data for heatmaps
└─ StateHistory                       ← Version control for planograms

LAYER 2: UNIVERSAL REPRESENTATION LAYER
├─ Semantic Coordinates               ← Fixture-agnostic positioning
├─ Product Semantics                  ← SKU, constraints, metadata
├─ BUSINESS CONTEXT (INTENT)          ← Dictates Layer 4 renderer selection
├─ Extension Schema                   ← Plugin definitions
└─ Validation Rules                   ← Pre-render validation

LAYER 3: FACINGS & PYRAMID LAYER (INSTANCE NORMALIZER - CORE LAYER PROCESSING)
├─ FacingCalculator                   ← 2D rectangular footprints (H×V)
├─ PyramidBuilder                     ← Multi-layer stacking logic
├─ INSTANCE NORMALIZER (CORE)         ← Group → Individual instances
└─ Collision Pre-check                ← Overlap validation (initial check)

--- CORE LAYER PROCESSING (FR-2.1 Data Prep) ---
├─ **ProductInstanceGenerator**       ← Combines L1-L3 data into prepared instances
│  └─ **CorePerspectiveScaler**       ← Calculates renderScale, depthRatio based on depth
│  └─ **CoreZLayerManager**           ← Calculates final zIndex with shelf/facing bonuses
│  └─ **CoreProductPositioner**       ← Calculates final renderCoordinates & bounds
│  └─ **ShadowTypeDeterminer**        ← Determines shadow needs
│  └─ **MaskRequiredChecker**         ← Determines if mask is needed
└─ **Validation Rules Processor**     ← Applies L2 validation rules to instances

--- RENDERER LAYER (CORE LAYER - FR-2.1 DRAWING ENGINE) ---
LAYER 4: RENDERER LAYER (CORE LAYER - FR-2.1)
├─ **RENDER ENGINE SUBSYSTEM**
│  ├─ RenderEngine                    ← Platform-specific orchestration (Canvas, WebGL, Three.js)
│  ├─ ViewportCuller                  ← Performance optimization (60fps) - CORE LAYER OUTPUT CONSUMED HERE
│  ├─ ProgressiveLoader               ← Asset loading strategy (uses AssetManager)
│  └─ PerformanceMonitor              ← FPS/memory tracking
│
├─ **VISUAL ORCHESTRATION SUBSYSTEM**
│  ├─ PlanogramRenderer               ← Visual entry point, uses RenderEngine
│  ├─ ZLayerManager                   ← **(Renderer Version)**: Manages drawing order/depth on target canvas
│  ├─ ProductPositioner               ← **(Renderer Version)**: Applies final transform to sprites/meshes
│  └─ HitTester                       ← Interaction detection (using prepared instance data)
│
├─ **SPRITE EXECUTION SUBSYSTEM**
│  ├─ ProductSprite                   ← **(Renderer Version)**: Renders specific sprite angle (uses 9-angle logic)
│  ├─ MaskRenderer                    ← **(Renderer Version)**: Renders masks onto sprites
│  ├─ ShadowRenderer                  ← **(Renderer Version)**: Renders shadows based on prepared data
│  └─ SpriteCache                     ← Performance optimization
│
├─ **RETAIL METADATA SUBSYSTEM**
│  ├─ PriceDisplay                    ← ZOOM-ADAPTIVE pricing (0.5x-3.0x) - Uses Renderer's zoom context
│  ├─ LabelRenderer                   ← Edge strips & promotions
│  └─ HeatmapEngine                   ← Business intelligence overlays (applied by context renderer)
│
└─ **CONTEXT SUBSYSTEM**
   ├─ PublisherRenderer               ← 2D with heatmaps (uses RenderEngine, applies HeatmapEngine)
   ├─ VisualizerRenderer              ← 2.5D with parallax (uses RenderEngine, applies ParallaxController)
   └─ VSERenderer                     ← 3D immersive (uses RenderEngine, potentially Three.js orchestrator)

LAYER 5: RETAIL PHYSICS LAYER (EDITING-ONLY)
├─ Drag-and-Drop Engine               ← Real-time interaction
├─ Collision Detection                ← Overlap prevention (uses CORE LAYER's bounds data)
├─ Magnetic Snapping                  ← Grid alignment
├─ Gravity Simulator                  ← Stacking behavior
├─ UNDOMANAGER (NEW)                  ← State history with checkpoints
├─ EditState Manager                  ← Track editing operations
└─ PLACEMENTMODEL VALIDATION (NEW)    ← Real-time bounds checking (uses PlacementModelRegistry)
```

---

**Key Takeaways for Reconciliation:**

1.  **Core Layer is the Data Preparer:** Think of the Core Layer (FR-2.1) as the backend processing pipeline. It takes the abstract, semantic data and transforms it into detailed, ready-to-render instructions and data structures. It applies the "retail truths" and physics.
2.  **Renderer Layer is the Frontend Artist:** The Renderer Layer is the actual drawing engine. It takes the prepared data, optimizes it (culling), and then uses its sub-systems to put pixels on the screen or create 3D meshes. It's where platform-specific drawing happens and where context (publisher, visualizer, VSE) significantly impacts the final output.
3.  **Shared Components with Different Roles:** Some components (like `ProductPositioner`, `ZLayerManager`, `ShadowRenderer`) appear in both the Core Layer processing (as data preparers) and the Renderer Layer (as drawing implementers). Their role shifts:
    *   **Core:** Calculates *what* the position/z-index/shadow should be.
    *   **Renderer:** *Applies* that calculated position/z-index/shadow to the visual output.
4.  **`prototypes` directory:** The code in `prototypes` seems to be an early implementation or demonstration of these concepts. For example, `prototypes/renderer.ts` shows a `Publisher2DRenderer` that directly uses `calculateProductLayout` (from `facings.ts`, which is part of the Core Layer's responsibilities) and then draws it. This is a good example of the Renderer consuming Core Layer's output. `prototypes/atlas.ts` fits within the Renderer's asset management. `prototypes/data.ts` is Layer 1/2 data.

By distinguishing between "preparing the data" (Core Layer) and "drawing the data" (Renderer Layer), we achieve a cleaner separation of concerns. The Core Layer ensures the accuracy and consistency of the visual representation according to retail rules, while the Renderer Layer ensures efficient and platform-appropriate drawing.
