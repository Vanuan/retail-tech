# **Complete Core Layer Architecture v2.2 Specification**

## **I. Updated Five-Layer System Architecture**

```
FIVE-LAYER SYSTEM ARCHITECTURE
===============================

LAYER 1: DATA LAYER (FR-1)
├─ FixtureRegistry            ← Physical structure definitions
├─ PlacementModelRegistry     ← Spatial logic strategies  
├─ AssetManager               ← Sprite, mask, background assets
├─ PlanogramConfig            ← Semantic "retail truths"
└─ PerformanceMetrics         ← Sales data for heatmaps

LAYER 2: UNIVERSAL REPRESENTATION LAYER (FR-2)
├─ Semantic Coordinates       ← Fixture-agnostic positioning
├─ Product Semantics          ← SKU, constraints, metadata
├─ Business Context           ← Publisher/Visualizer/VSE intent
└─ Extension Schema           ← Plugin definitions

LAYER 3: FACINGS & PYRAMID LAYER (FR-2.2 - NEW DEFINITION)
├─ FacingCalculator           ← 2D rectangular footprints (H×V)
├─ PyramidBuilder             ← Multi-layer stacking logic
├─ Instance Normalizer        ← Group → Individual instances
├─ Collision Pre-check        ← Overlap validation
└─ Facings Validator         ← Business rule compliance

LAYER 4: RENDERER LAYER (CORE LAYER - FR-2.1)
├─ RENDER ENGINE SUBSYSTEM
│  ├─ RenderEngine            ← Platform-specific orchestration
│  ├─ ViewportCuller          ← Performance optimization
│  ├─ ProgressiveLoader       ← Asset loading strategy
│  └─ PerformanceMonitor      ← FPS/memory tracking
│
├─ VISUAL ORCHESTRATION SUBSYSTEM
│  ├─ PlanogramRenderer       ← Visual entry point
│  ├─ ZLayerManager           ← Depth management (front/back)
│  ├─ ProductPositioner       ← Coordinate transformation
│  └─ HitTester              ← Interaction detection
│
├─ SPRITE EXECUTION SUBSYSTEM  
│  ├─ ProductSprite           ← 9-angle 2.5D sprites
│  ├─ MaskRenderer           ← Non-rectangular shapes
│  ├─ ShadowRenderer         ← Drop shadows for realism
│  └─ SpriteCache            ← Performance optimization
│
├─ RETAIL METADATA SUBSYSTEM
│  ├─ PriceDisplay           ← Zoom-adaptive pricing
│  ├─ LabelRenderer          ← Edge strips & promotions
│  └─ HeatmapEngine         ← Business intelligence overlays
│
└─ CONTEXT SUBSYSTEM
   ├─ PublisherRenderer      ← 2D with heatmaps
   ├─ VisualizerRenderer     ← 2.5D with parallax
   └─ VSERenderer           ← 3D immersive

LAYER 5: RETAIL PHYSICS LAYER (EDITING-ONLY)
├─ Drag-and-Drop Engine      ← Real-time interaction
├─ Collision Detection       ← Overlap prevention
├─ Magnetic Snapping         ← Grid alignment
└─ Gravity Simulator         ← Stacking behavior
```

## **II. Layer 3: Facings & Pyramid Layer (Critical Addition)**

```javascript
/**
 * LAYER 3: FACINGS & PYRAMID LAYER
 * Transforms high-level merchandise instructions into individual instances
 * Handles 2D rectangular footprints and multi-layer stacking
 */
class FacingsPyramidLayer {
  constructor() {
    this.facingCalculator = new FacingCalculator();
    this.pyramidBuilder = new PyramidBuilder();
    this.instanceNormalizer = new InstanceNormalizer();
  }
  
  /**
   * Process product placements with facing/pyramid configurations
   * @param {ProductPlacement[]} placements - High-level placements
   * @param {FixtureConfig} fixture - Fixture constraints
   * @returns {ProductInstance[]} - Normalized individual instances
   */
  processPlacements(placements, fixture) {
    const normalizedInstances = [];
    
    for (const placement of placements) {
      // Handle 2D rectangular facings (horizontal × vertical)
      if (placement.facings) {
        const facingInstances = this.expandFacings(placement, fixture);
        normalizedInstances.push(...facingInstances);
      }
      
      // Handle stacked pyramid configurations
      if (placement.pyramid) {
        const pyramidInstances = this.buildPyramid(placement, fixture);
        normalizedInstances.push(...pyramidInstances);
      }
      
      // Default: single instance
      if (!placement.facings && !placement.pyramid) {
        normalizedInstances.push(this.createSingleInstance(placement));
      }
    }
    
    // Validate no overlaps before passing to renderer
    this.validateNoOverlaps(normalizedInstances, fixture);
    
    return normalizedInstances;
  }
}

/**
 * Handles 2D rectangular footprints (horizontal × vertical facings)
 */
class FacingCalculator {
  /**
   * Expand a product placement into multiple instances
   * @param {ProductPlacement} placement - Base placement
   * @param {number} horizontal - Horizontal facing count (1-10)
   * @param {number} vertical - Vertical facing count (1-4)
   * @returns {ProductInstance[]} - Grid of product instances
   */
  expandFacings(placement, fixture) {
    const { horizontal = 1, vertical = 1 } = placement.facings;
    const instances = [];
    const productWidth = placement.dimensions.width;
    const productHeight = placement.dimensions.height;
    
    // Create grid of instances
    for (let h = 0; h < horizontal; h++) {
      for (let v = 0; v < vertical; v++) {
        instances.push({
          ...placement,
          id: `${placement.id}-f${h}-${v}`,
          isFacing: true,
          facingIndex: { horizontal: h, vertical: v },
          renderCoordinates: {
            x: placement.coordinates.x + (h * productWidth),
            y: placement.coordinates.y + (v * productHeight),
            z: placement.coordinates.z,
            // Perspective scaling adjustments for depth
            scale: this.calculateFacingScale(h, v, horizontal, vertical)
          },
          // Reference back to parent for group operations
          parentPlacementId: placement.id
        });
      }
    }
    
    return instances;
  }
  
  /**
   * Calculate scale for each facing position (front larger, back smaller)
   */
  calculateFacingScale(hIndex, vIndex, hTotal, vTotal) {
    // Front row (h=0) at 100%, back row progressively smaller
    const horizontalScale = 1.0 - (hIndex * 0.03); // 3% reduction per facing
    
    // Top row (v=0) at 100%, bottom row slightly smaller
    const verticalScale = 1.0 - (vIndex * 0.01); // 1% reduction per vertical
    
    return horizontalScale * verticalScale;
  }
}

/**
 * Handles multi-layer stacked pyramid configurations
 */
class PyramidBuilder {
  /**
   * Build stacked pyramid configuration
   * @param {PyramidConfig} config - Pyramid specifications
   * @returns {ProductInstance[]} - Stacked instances
   */
  buildPyramid(placement, fixture) {
    const { layers = 1, baseFacings, alignment = 'center' } = placement.pyramid;
    const instances = [];
    
    for (let layer = 0; layer < layers; layer++) {
      // Calculate facings for this layer (pyramid reduces upward)
      const layerFacings = this.calculateLayerFacings(layer, baseFacings);
      
      // Calculate offset for this layer's base
      const layerOffset = this.calculateLayerOffset(layer, placement.dimensions.height);
      
      // Create instances for this layer
      const layerInstances = this.createLayerInstances(
        placement,
        layerFacings,
        layerOffset,
        layer,
        alignment
      );
      
      instances.push(...layerInstances);
    }
    
    return instances;
  }
  
  /**
   * Calculate facings for a specific pyramid layer
   */
  calculateLayerFacings(layerIndex, baseFacings) {
    // Pyramid reduces by 1 facing per layer (centered)
    return {
      horizontal: Math.max(1, baseFacings.horizontal - layerIndex),
      vertical: Math.max(1, baseFacings.vertical - layerIndex)
    };
  }
  
  /**
   * Calculate vertical offset for stacking
   */
  calculateLayerOffset(layerIndex, productHeight) {
    // Each layer sits on top of previous layer
    return layerIndex * productHeight * 0.9; // 90% overlap for stability
  }
}

/**
 * Normalizes groups into individual instances for rendering
 */
class InstanceNormalizer {
  /**
   * Convert all placements to individual renderable instances
   */
  normalize(placements, fixture) {
    return placements.flatMap(placement => {
      // Apply facing/pyramid expansion from Layer 3
      const expanded = this.expandPlacement(placement, fixture);
      
      // Convert to render-ready instances
      return expanded.map(instance => ({
        id: instance.id,
        sku: instance.sku,
        sprite: instance.sprite,
        mask: instance.mask,
        renderCoordinates: this.calculateRenderCoords(instance, fixture),
        // Layer 4 render properties
        zIndex: this.calculateZIndex(instance),
        shadowIntensity: this.calculateShadow(instance),
        // Original placement reference
        sourcePlacement: placement
      }));
    });
  }
}
```

## **III. Complete Core Layer (Layer 4) Components**

### **A. Render Engine Subsystem**
```javascript
/**
 * ViewportCuller - Performance optimization
 * Ensures only visible products are rendered to maintain 60fps
 */
class ViewportCuller {
  constructor() {
    this.visibilityMargin = 200; // Preload margin in pixels
    this.lastViewport = null;
    this.cache = new Map();
  }
  
  /**
   * Determine which products are visible in current viewport
   * @param {ProductInstance[]} allInstances - All product instances
   * @param {Viewport} viewport - Current view parameters
   * @returns {ProductInstance[]} - Visible instances only
   */
  cull(allInstances, viewport) {
    // Cache results for performance if viewport unchanged
    const cacheKey = this.getViewportKey(viewport);
    if (this.cache.has(cacheKey) && this.isViewportSimilar(viewport)) {
      return this.cache.get(cacheKey);
    }
    
    // Calculate visible bounds with margin
    const visibleBounds = this.calculateVisibleBounds(viewport);
    
    // Filter instances within visible bounds
    const visibleInstances = allInstances.filter(instance => {
      const bounds = instance.renderCoordinates.bounds;
      return this.boundsIntersect(bounds, visibleBounds);
    });
    
    // Sort by distance from viewport center (for progressive loading)
    this.sortByProximity(visibleInstances, viewport);
    
    // Cache result
    this.cache.set(cacheKey, visibleInstances);
    this.lastViewport = viewport;
    
    return visibleInstances;
  }
  
  /**
   * Calculate visible area with preload margin
   */
  calculateVisibleBounds(viewport) {
    return {
      x: viewport.x - this.visibilityMargin,
      y: viewport.y - this.visibilityMargin,
      width: viewport.width + (2 * this.visibilityMargin),
      height: viewport.height + (2 * this.visibilityMargin)
    };
  }
}

/**
 * PerformanceMonitor - Tracks FPS and memory usage
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      fps: new RollingAverage(60),
      frameTime: new RollingAverage(60),
      memory: new RollingAverage(10),
      visibleProducts: 0,
      drawCalls: 0
    };
    
    this.thresholds = {
      targetFPS: 60,
      maxFrameTime: 16, // ms
      maxMemoryMB: 512
    };
  }
  
  /**
   * Monitor and optimize rendering performance
   */
  monitor(frameData) {
    this.metrics.fps.add(this.calculateFPS());
    this.metrics.frameTime.add(frameData.renderTime);
    this.metrics.memory.add(this.getMemoryUsage());
    this.metrics.visibleProducts = frameData.visibleCount;
    this.metrics.drawCalls = frameData.drawCalls;
    
    // Apply optimizations if thresholds exceeded
    if (this.metrics.fps.value < this.thresholds.targetFPS * 0.9) {
      this.degradeQuality();
    }
    
    // Log performance data for analysis
    this.logPerformance();
  }
  
  /**
   * Gracefully degrade quality to maintain performance
   */
  degradeQuality() {
    const optimizations = [
      { condition: this.metrics.fps.value < 45, action: 'disableShadows' },
      { condition: this.metrics.fps.value < 30, action: 'reduceSpriteQuality' },
      { condition: this.metrics.visibleProducts > 200, action: 'increaseCullingMargin' },
      { condition: this.metrics.memory.value > 400, action: 'clearSpriteCache' }
    ];
    
    optimizations.forEach(opt => {
      if (opt.condition) {
        this.applyOptimization(opt.action);
      }
    });
  }
}
```

### **B. Visual Execution Subsystem**
```javascript
/**
 * ShadowRenderer - Essential for photorealism
 * Renders drop shadows to prevent "floating" appearance
 */
class ShadowRenderer {
  constructor() {
    this.shadowCache = new Map();
    this.shadowTypes = {
      shelf: { blur: 8, offsetY: 4, color: 'rgba(0,0,0,0.3)' },
      pegboard: { blur: 4, offsetY: 2, color: 'rgba(0,0,0,0.2)' },
      floating: { blur: 12, offsetY: 8, color: 'rgba(0,0,0,0.4)' }
    };
  }
  
  /**
   * Render shadow for a product instance
   * @param {CanvasRenderingContext2D} ctx - Rendering context
   * @param {ProductInstance} instance - Product to shadow
   * @param {number} intensity - Shadow darkness (0.0-1.0)
   */
  render(ctx, instance, intensity = 0.7) {
    const shadowType = this.determineShadowType(instance);
    const shadow = this.shadowTypes[shadowType];
    
    // Calculate shadow geometry based on product shape
    const shadowPath = this.calculateShadowPath(instance);
    
    // Apply shadow styling
    ctx.save();
    ctx.shadowColor = this.adjustAlpha(shadow.color, intensity);
    ctx.shadowBlur = shadow.blur;
    ctx.shadowOffsetY = shadow.offsetY;
    
    // Draw shadow
    ctx.fillStyle = shadow.color;
    ctx.fill(shadowPath);
    
    ctx.restore();
    
    return {
      rendered: true,
      type: shadowType,
      intensity: intensity
    };
  }
  
  /**
   * Determine shadow type based on product placement
   */
  determineShadowType(instance) {
    if (instance.renderCoordinates.z > 50) return 'floating';
    if (instance.sourcePlacement?.fixtureType === 'pegboard') return 'pegboard';
    return 'shelf';
  }
  
  /**
   * Calculate shadow path matching product shape
   */
  calculateShadowPath(instance) {
    const { x, y, width, height } = instance.renderCoordinates.bounds;
    
    // Create path that matches product silhouette
    const path = new Path2D();
    
    // For masked products, use approximation of shape
    if (instance.mask) {
      // Simplified shadow that follows general product shape
      path.ellipse(x + width/2, y + height, width/2, height/6, 0, 0, Math.PI * 2);
    } else {
      // Rectangular shadow for boxy products
      path.rect(x, y + height * 0.1, width, height * 0.15);
    }
    
    return path;
  }
}
```

### **C. Retail Metadata Subsystem**
```javascript
/**
 * HeatmapEngine - Business intelligence visualization
 * Overlays color spectrum (Green→Red) based on performance metrics
 */
class HeatmapEngine {
  constructor() {
    this.colorScale = this.createColorScale();
    this.metrics = {
      turnover: { min: 0, max: 100 },
      velocity: { min: 0, max: 50 },
      profit: { min: -20, max: 40 }
    };
  }
  
  /**
   * Apply heatmap overlay to rendered planogram
   * @param {CanvasRenderingContext2D} ctx - Rendering context
   * @param {ProductInstance[]} instances - Product instances
   * @param {PerformanceData} metrics - Business performance data
   */
  applyHeatmap(ctx, instances, metrics) {
    // Create heatmap overlay layer
    const heatmapLayer = this.createHeatmapLayer(ctx.canvas.width, ctx.canvas.height);
    const heatmapCtx = heatmapLayer.getContext('2d');
    
    // Draw heatmap colors for each product
    instances.forEach(instance => {
      const productMetrics = metrics[instance.sku];
      if (!productMetrics) return;
      
      const color = this.calculateHeatmapColor(productMetrics);
      this.drawProductHeat(heatmapCtx, instance, color);
    });
    
    // Blend heatmap layer with original render
    this.blendHeatmap(ctx, heatmapLayer);
    
    // Add legend if space permits
    this.renderLegend(ctx, metrics);
  }
  
  /**
   * Create color scale from Green (good) to Red (bad)
   */
  createColorScale() {
    // Green (0.0) → Yellow (0.5) → Red (1.0)
    return [
      { value: 0.0, color: '#4CAF50' },   // Green
      { value: 0.3, color: '#8BC34A' },   // Light Green
      { value: 0.5, color: '#FFEB3B' },   // Yellow
      { value: 0.7, color: '#FF9800' },   // Orange
      { value: 1.0, color: '#F44336' }    // Red
    ];
  }
  
  /**
   * Calculate color based on performance metrics
   */
  calculateHeatmapColor(metrics) {
    // Calculate normalized score (0.0-1.0)
    const score = this.calculatePerformanceScore(metrics);
    
    // Find color in scale
    for (let i = 1; i < this.colorScale.length; i++) {
      if (score <= this.colorScale[i].value) {
        const prev = this.colorScale[i - 1];
        const next = this.colorScale[i];
        const ratio = (score - prev.value) / (next.value - prev.value);
        
        return this.interpolateColor(prev.color, next.color, ratio);
      }
    }
    
    return this.colorScale[this.colorScale.length - 1].color;
  }
  
  /**
   * Calculate performance score from multiple metrics
   */
  calculatePerformanceScore(metrics) {
    const weights = {
      turnover: 0.4,
      velocity: 0.3,
      profit: 0.3
    };
    
    let totalScore = 0;
    Object.entries(weights).forEach(([metric, weight]) => {
      const normalized = this.normalizeMetric(metrics[metric], metric);
      totalScore += normalized * weight;
    });
    
    return totalScore;
  }
}

/**
 * LabelRenderer - Handles retail metadata beyond pricing
 */
class LabelRenderer {
  constructor() {
    this.labelTypes = {
      price: { fontSize: 12, color: '#000000', background: '#FFFFFF' },
      promotion: { fontSize: 10, color: '#FFFFFF', background: '#E53935' },
      edgeStrip: { fontSize: 9, color: '#FFFFFF', background: '#1976D2' },
      shelfTalker: { fontSize: 11, color: '#000000', background: '#FFEB3B' }
    };
  }
  
  /**
   * Render various label types
   */
  renderLabel(ctx, labelData, viewport) {
    const { type, text, position, product } = labelData;
    const style = this.labelTypes[type];
    
    // Calculate screen-space position
    const screenPos = this.worldToScreen(position, viewport);
    
    // Adjust font size based on zoom
    const fontSize = this.calculateDynamicFontSize(style.fontSize, viewport.zoom);
    
    // Render label background
    this.renderLabelBackground(ctx, screenPos, text, fontSize, style);
    
    // Render text
    this.renderLabelText(ctx, screenPos, text, fontSize, style);
    
    // Add special effects based on label type
    this.applyLabelEffects(ctx, type, screenPos);
  }
  
  /**
   * Dynamic font sizing for readability at all zoom levels
   */
  calculateDynamicFontSize(baseSize, zoom) {
    const minSize = 8;
    const maxSize = 24;
    const zoomAdjusted = baseSize * zoom;
    
    return Math.max(minSize, Math.min(maxSize, zoomAdjusted));
  }
}
```

### **D. Interaction Detection Subsystem**
```javascript
/**
 * HitTester - Manages pixel-perfect interaction detection
 * Handles screen-to-world transforms and alpha mask testing
 */
class HitTester {
  constructor() {
    this.selectionBuffer = new Map();
    this.hitThreshold = 0.3; // Alpha threshold for selection
  }
  
  /**
   * Test if point hits a product (considering alpha masks)
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @param {ProductInstance[]} instances - Potential hit targets
   * @param {Viewport} viewport - Current viewport
   * @returns {ProductInstance|null} - Hit product or null
   */
  testHit(screenX, screenY, instances, viewport) {
    // Convert screen to world coordinates
    const worldPos = this.screenToWorld(screenX, screenY, viewport);
    
    // Check instances in reverse z-order (front to back)
    const sortedInstances = [...instances].sort((a, b) => b.zIndex - a.zIndex);
    
    for (const instance of sortedInstances) {
      // Fast bounding box test first
      if (!this.pointInBounds(worldPos, instance.bounds)) {
        continue;
      }
      
      // If product has alpha mask, perform pixel-perfect test
      if (instance.mask) {
        const hits = this.testAlphaMask(worldPos, instance);
        if (hits) return instance;
      } else {
        // No mask - bounding box hit is sufficient
        return instance;
      }
    }
    
    return null;
  }
  
  /**
   * Test alpha mask for pixel-perfect selection
   */
  testAlphaMask(worldPos, instance) {
    const { x, y, width, height } = instance.bounds;
    
    // Calculate relative position within sprite
    const relX = worldPos.x - x;
    const relY = worldPos.y - y;
    
    // Convert to pixel coordinates
    const pixelX = Math.floor((relX / width) * instance.mask.width);
    const pixelY = Math.floor((relY / height) * instance.mask.height);
    
    // Check if pixel is within mask bounds
    if (pixelX < 0 || pixelX >= instance.mask.width || 
        pixelY < 0 || pixelY >= instance.mask.height) {
      return false;
    }
    
    // Get alpha value at this pixel
    const alpha = this.getMaskAlpha(instance.mask, pixelX, pixelY);
    
    // Hit if alpha exceeds threshold
    return alpha > this.hitThreshold * 255;
  }
  
  /**
   * Get alpha value from mask at specified position
   */
  getMaskAlpha(mask, x, y) {
    // Implementation depends on mask format
    // For Canvas ImageData:
    const data = mask.data;
    const index = (y * mask.width + x) * 4;
    return data[index + 3]; // Alpha channel
  }
}
```

## **IV. Updated ProductSprite with 9-Angle Logic**

```javascript
/**
 * ProductSprite with explicit 9-angle support for 2.5D parallax
 */
class ProductSprite {
  constructor() {
    // REQUIRED: 9 distinct viewing angles as per specifications
    this.angleVariants = [
      // Front views (0° rotation)
      { name: 'front-0', rotation: 0, tilt: 0, scale: 1.00, priority: 0 },
      { name: 'tilt-5', rotation: 0, tilt: 5, scale: 0.98, priority: 1 },
      { name: 'tilt-10', rotation: 0, tilt: 10, scale: 0.96, priority: 2 },
      { name: 'tilt-back-5', rotation: 0, tilt: -5, scale: 0.98, priority: 1 },
      { name: 'tilt-back-10', rotation: 0, tilt: -10, scale: 0.96, priority: 2 },
      
      // Rotated views (±15°, ±30°)
      { name: 'rotate-15', rotation: 15, tilt: 0, scale: 0.97, priority: 3 },
      { name: 'rotate-30', rotation: 30, tilt: 0, scale: 0.94, priority: 4 },
      { name: 'rotate-back-15', rotation: -15, tilt: 0, scale: 0.97, priority: 3 },
      { name: 'rotate-back-30', rotation: -30, tilt: 0, scale: 0.94, priority: 4 }
    ];
    
    // Angle selection cache for performance
    this.selectionCache = new Map();
  }
  
  /**
   * Select appropriate sprite variant based on viewing angle
   * Implements smooth transitions between the 9 angles
   */
  selectVariant(tiltAngle, rotationAngle) {
    const cacheKey = `${tiltAngle.toFixed(1)}_${rotationAngle.toFixed(1)}`;
    
    if (this.selectionCache.has(cacheKey)) {
      return this.selectionCache.get(cacheKey);
    }
    
    // Normalize angles to nearest available variant
    const normalizedTilt = this.normalizeAngle(tiltAngle, 'tilt');
    const normalizedRotation = this.normalizeAngle(rotationAngle, 'rotation');
    
    // Find best matching variant
    const bestMatch = this.findBestMatch(normalizedTilt, normalizedRotation);
    
    // Cache result
    this.selectionCache.set(cacheKey, bestMatch);
    
    // Manage cache size
    if (this.selectionCache.size > 1000) {
      this.selectionCache.delete(this.selectionCache.keys().next().value);
    }
    
    return bestMatch;
  }
  
  /**
   * Find best matching variant from the 9 angles
   */
  findBestMatch(tilt, rotation) {
    return this.angleVariants.reduce((best, variant) => {
      const tiltDiff = Math.abs(variant.tilt - tilt);
      const rotationDiff = Math.abs(variant.rotation - rotation);
      const totalDiff = (tiltDiff * 0.7) + (rotationDiff * 0.3); // Weighted
      
      if (totalDiff < best.diff) {
        return { variant, diff: totalDiff };
      }
      return best;
    }, { variant: this.angleVariants[0], diff: Infinity }).variant;
  }
  
  /**
   * Normalize angle to nearest available variant
   */
  normalizeAngle(angle, type) {
    const ranges = {
      tilt: [-10, -5, 0, 5, 10],
      rotation: [-30, -15, 0, 15, 30]
    };
    
    const available = ranges[type];
    if (!available) return angle;
    
    // Find closest available angle
    return available.reduce((closest, availableAngle) => {
      return Math.abs(availableAngle - angle) < Math.abs(closest - angle) 
        ? availableAngle 
        : closest;
    }, available[0]);
  }
}
```

## **V. Updated PriceDisplay with Zoom-Adaptive Scaling**

```javascript
/**
 * PriceDisplay with explicit zoom-adaptive scaling (0.5x - 3.0x)
 */
class PriceDisplay {
  constructor() {
    this.zoomLevels = {
      min: 0.5,   // Minimum zoom
      max: 3.0,   // Maximum zoom
      base: 1.0   // Normal zoom
    };
    
    this.fontSizes = {
      // Base sizes at 1.0x zoom
      unitPrice: 12,
      promoPrice: 10,
      clubcardPrice: 9,
      unitMeasure: 8,
      
      // Minimum readable sizes at 0.5x zoom
      min: {
        unitPrice: 8,
        promoPrice: 7,
        clubcardPrice: 6,
        unitMeasure: 5
      },
      
      // Maximum sizes at 3.0x zoom
      max: {
        unitPrice: 24,
        promoPrice: 20,
        clubcardPrice: 18,
        unitMeasure: 16
      }
    };
  }
  
  /**
   * Calculate font size for current zoom level
   * @param {string} priceType - Type of price being rendered
   * @param {number} zoomLevel - Current zoom (0.5-3.0)
   * @returns {number} - Calculated font size
   */
  calculateFontSize(priceType, zoomLevel) {
    const baseSize = this.fontSizes[priceType];
    const minSize = this.fontSizes.min[priceType];
    const maxSize = this.fontSizes.max[priceType];
    
    // Linear scaling between min and max zoom
    if (zoomLevel <= this.zoomLevels.base) {
      // Scale from min to base
      const ratio = (zoomLevel - this.zoomLevels.min) / 
                   (this.zoomLevels.base - this.zoomLevels.min);
      return minSize + (ratio * (baseSize - minSize));
    } else {
      // Scale from base to max
      const ratio = (zoomLevel - this.zoomLevels.base) / 
                   (this.zoomLevels.max - this.zoomLevels.base);
      return baseSize + (ratio * (maxSize - baseSize));
    }
  }
  
  /**
   * Render price with zoom-adaptive scaling
   */
  renderPrice(ctx, priceData, position, zoomLevel) {
    const fontSize = this.calculateFontSize(priceData.type, zoomLevel);
    
    ctx.save();
    
    // Scale entire context for crisp rendering
    ctx.scale(zoomLevel, zoomLevel);
    
    // Set font with calculated size
    ctx.font = `${fontSize}px 'Segoe UI', Arial, sans-serif`;
    
    // Render price with appropriate styling
    this.renderStyledPrice(ctx, priceData, position, fontSize);
    
    ctx.restore();
  }
}
```

## **VI. Updated ProductPositioner with Perspective Scaling**

```javascript
/**
 * ProductPositioner with explicit perspective scaling (100% front → 92% back)
 */
class ProductPositioner {
  constructor() {
    // Retail physics constants
    this.perspectiveScale = {
      front: 1.00,  // 100% scale for front-row items
      back: 0.92,   // 92% scale for back-row items (8% reduction)
      gradient: 'linear' // Scale reduction type
    };
    
    this.depthScaleFactors = {
      // Scale reduction per depth unit (mm)
      linear: (depth, maxDepth) => {
        const ratio = depth / maxDepth;
        return this.perspectiveScale.front - 
               (ratio * (this.perspectiveScale.front - this.perspectiveScale.back));
      },
      
      // Exponential scaling for more dramatic perspective
      exponential: (depth, maxDepth) => {
        const ratio = depth / maxDepth;
        const scaleRange = this.perspectiveScale.front - this.perspectiveScale.back;
        return this.perspectiveScale.front - (Math.pow(ratio, 1.5) * scaleRange);
      }
    };
  }
  
  /**
   * Apply perspective scaling based on product depth
   * @param {number} depth - Product depth in scene (0-front, maxDepth-back)
   * @param {number} maxDepth - Maximum depth of fixture
   * @returns {number} - Scale factor (0.92-1.00)
   */
  calculatePerspectiveScale(depth, maxDepth) {
    const scaleFunction = this.depthScaleFactors[this.perspectiveScale.gradient];
    return scaleFunction(depth, maxDepth);
  }
  
  /**
   * Calculate final render coordinates with perspective
   */
  calculateRenderCoordinates(product, fixture, placementModel) {
    // Base coordinates from placement model
    const baseCoords = placementModel.transform(
      product.coordinates,
      fixture.config
    );
    
    // Calculate perspective scale
    const depth = product.coordinates.depth || 0;
    const maxDepth = fixture.dimensions.depth;
    const perspectiveScale = this.calculatePerspectiveScale(depth, maxDepth);
    
    // Apply scale to dimensions
    const scaledWidth = product.dimensions.width * perspectiveScale;
    const scaledHeight = product.dimensions.height * perspectiveScale;
    
    // Adjust position for scaled size (centered)
    const scaleOffsetX = (product.dimensions.width - scaledWidth) / 2;
    const scaleOffsetY = (product.dimensions.height - scaledHeight) / 2;
    
    return {
      ...baseCoords,
      x: baseCoords.x + scaleOffsetX,
      y: baseCoords.y + scaleOffsetY,
      width: scaledWidth,
      height: scaledHeight,
      scale: perspectiveScale,
      originalScale: 1.0,
      isScaled: perspectiveScale !== 1.0
    };
  }
}
```

## **VII. Registry-Driven Architecture**

```javascript
/**
 * Registry-driven PlanogramRenderer
 */
class PlanogramRenderer {
  constructor(fixtureRegistry, placementModelRegistry) {
    // Explicit registry dependencies
    this.fixtureRegistry = fixtureRegistry;
    this.placementModelRegistry = placementModelRegistry;
    
    // Query registries for every render
    this.render = async (planogramConfig, context, viewport) => {
      // 1. Query FixtureRegistry for physical structure
      const fixtureDef = await this.fixtureRegistry.get(planogramConfig.fixture.type);
      
      // 2. Query PlacementModelRegistry for spatial logic
      const placementModel = await this.placementModelRegistry.get(
        planogramConfig.fixture.placementModel
      );
      
      // 3. Validate compatibility
      if (!placementModel.isCompatibleWith(fixtureDef.type)) {
        throw new Error('Fixture/Placement model incompatibility');
      }
      
      // 4. Load 4K background from fixture definition
      const background = await this.loadAsset(fixtureDef.background.assetUrl, {
        resolution: fixtureDef.background.resolution,
        format: 'webp'
      });
      
      // Continue with rendering using registry-provided data...
    };
  }
}

/**
 * Registry-driven ProductPositioner
 */
class ProductPositioner {
  constructor(placementModelRegistry) {
    this.placementModelRegistry = placementModelRegistry;
    
    this.calculatePosition = (product, fixtureConfig, modelName) => {
      // Query registry for appropriate placement model
      const model = this.placementModelRegistry.get(modelName);
      
      // Use model-specific transformation logic
      return model.transform(product.coordinates, fixtureConfig);
    };
  }
}
```

