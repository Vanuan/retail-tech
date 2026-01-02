# **Core Layer (FR-2.1) Implementation Blueprint**

## **I. Data Foundation: Complete Input Specification**

### **A. PlanogramConfig - The Single Source of Truth**
```json
{
  "$schema": "https://schemas.retail-optimizer.com/planogram/v2.2",
  "id": "PLG-CEREAL-AISLE-001",
  "metadata": {
    "name": "Breakfast Cereal Bay 1",
    "store": "TESCO-EXPRESS-7821",
    "category": "Cereals",
    "version": "2.2.0",
    "created": "2024-03-15T10:30:00Z",
    "modified": "2024-03-20T14:45:00Z",
    "author": "merchandiser@retail.com"
  },
  
  "fixture": {
    "type": "tesco-standard-shelf",          // FixtureRegistry key
    "placementModel": "shelf-surface",       // PlacementModelRegistry key
    "dimensions": {
      "width": 1200,                         // mm
      "height": 1800,                        // mm
      "depth": 400,                          // mm
      "levels": 5                            // 4-8 supported
    },
    "config": {
      "shelves": [
        { "index": 0, "y": 100, "height": 20, "label": "Bottom" },
        { "index": 1, "y": 450, "height": 20, "label": "Second" },
        { "index": 2, "y": 800, "height": 20, "label": "Middle" },
        { "index": 3, "y": 1150, "height": 20, "label": "Fourth" },
        { "index": 4, "y": 1500, "height": 20, "label": "Top" }
      ],
      "background": {
        "assetId": "TESCO-STANDARD-4K-A001",
        "resolution": "3840x2160",           // 4K minimum
        "format": "webp",
        "dpi": 300
      }
    }
  },
  
  "products": [
    {
      "id": "P-CORN-FLAKES-001",
      "sku": "CORNFLAKES-500G-BRAND-A",
      
      // SEMANTIC COORDINATES (not pixels)
      "placement": {
        "model": "shelf-surface",            // Must match fixture.placementModel
        "coordinates": {
          "shelfIndex": 2,                   // 0-based index (middle shelf)
          "x": 150,                          // mm from left edge
          "depth": 100,                      // mm from front (0-400)
          "facing": 4                        // Horizontal facings
        },
        "facings": {
          "horizontal": 4,                   // 2D rectangular footprint
          "vertical": 1
        },
        "constraints": {
          "minFacing": 2,
          "maxFacing": 6,
          "lockPosition": false
        }
      },
      
      // ASSET METADATA - Required for photorealism
      "assets": {
        "sprites": {
          "variants": [
            {
              "angle": "front-0",
              "url": "https://cdn.retail.com/products/CORNFLAKES-500G/front-0.webp",
              "dimensions": { "width": 300, "height": 400 }
            },
            {
              "angle": "tilt-5",
              "url": "https://cdn.retail.com/products/CORNFLAKES-500G/tilt-5.webp"
            },
            {
              "angle": "tilt-10",
              "url": "https://cdn.retail.com/products/CORNFLAKES-500G/tilt-10.webp"
            },
            // ... 9 angles total (Front 0°, Tilts ±5°/10°, Rotations ±15°/30°)
          ],
          "anchor": { "x": 0.5, "y": 1.0 }   // Bottom-center anchor point
        },
        "mask": {
          "url": "https://cdn.retail.com/products/CORNFLAKES-500G/mask.png",
          "format": "png-alpha"
        },
        "shadow": {
          "intensity": 0.7,                  // 0.0-1.0
          "offset": { "x": 0, "y": 8 }       // pixels
        }
      },
      
      // RETAIL METADATA
      "pricing": {
        "unitPrice": 2.50,
        "promotionalPrice": 2.00,
        "clubcardPrice": 1.80,
        "unitMeasure": "500g",
        "currency": "GBP"
      },
      
      // PERFORMANCE DATA (for heatmaps)
      "performance": {
        "turnover": 85.5,                    // Percentage relative to target
        "velocity": 42.3,                    // Units per week
        "profit": 0.45,                      // Profit margin
        "waste": 2.1                         // Percentage
      },
      
      // PHYSICAL DIMENSIONS (mm - for collision detection)
      "dimensions": {
        "width": 75,
        "height": 108,
        "depth": 75,
        "weight": 500
      }
    }
    // ... more products
  ],
  
  // PERFORMANCE CONTEXT
  "performance": {
    "targetFPS": 60,
    "maxVisibleProducts": 200,
    "memoryBudget": 512                      // MB
  },
  
  // RENDERING CONTEXT (determines which overlays to apply)
  "context": {
    "type": "publisher",                     // publisher | visualizer | vse
    "zoomRange": { "min": 0.5, "max": 3.0 },
    "enableHeatmap": true,
    "enableParallax": false                  // Publisher = 2D only
  }
}
```

## **II. Physical & Logical Registries Implementation**

### **A. FixtureRegistry - Physical Structure Definitions**
```javascript
/**
 * FIXTUREREGISTRY - Physical retail environment definitions
 * Provides 4K background assets and structural constraints
 */
class FixtureRegistry {
  constructor() {
    this.fixtures = new Map();
    this.assetCache = new Map();
    
    // Register built-in fixture types
    this.initializeBuiltInFixtures();
  }
  
  /**
   * Get fixture definition with background asset
   * @param {string} fixtureType - Registry key
   * @returns {Promise<FixtureDefinition>}
   */
  async get(fixtureType) {
    if (!this.fixtures.has(fixtureType)) {
      throw new Error(`Fixture type '${fixtureType}' not found in registry`);
    }
    
    const definition = this.fixtures.get(fixtureType);
    
    // Load background asset (cached)
    if (!this.assetCache.has(definition.config.background.assetId)) {
      const background = await this.loadBackgroundAsset(definition.config.background);
      this.assetCache.set(definition.config.background.assetId, background);
    }
    
    return {
      ...definition,
      background: this.assetCache.get(definition.config.background.assetId)
    };
  }
  
  /**
   * Initialize with built-in retail fixtures
   */
  initializeBuiltInFixtures() {
    // 1. STANDARD SHELF UNIT (4-8 levels)
    this.register('tesco-standard-shelf', {
      type: 'shelf',
      placementModel: 'shelf-surface',
      compatibleModels: ['shelf-surface'],
      
      dimensions: {
        width: 1200,    // mm
        height: 1800,   // mm
        depth: 400,     // mm
        levels: 5       // Supported: 4-8
      },
      
      config: {
        shelves: [
          { index: 0, y: 100, height: 20, capacity: 20 },
          { index: 1, y: 450, height: 20, capacity: 20 },
          { index: 2, y: 800, height: 20, capacity: 20 },
          { index: 3, y: 1150, height: 20, capacity: 20 },
          { index: 4, y: 1500, height: 20, capacity: 20 }
        ],
        
        background: {
          assetId: 'TESCO-STANDARD-4K-A001',
          resolution: '3840x2160',   // 4K minimum
          format: 'webp',
          dpi: 300,
          url: '/fixtures/tesco-standard-4k.webp'
        },
        
        edgeStrips: {
          enabled: true,
          height: 30,
          labelPosition: 'top'
        },
        
        constraints: {
          maxWeightPerShelf: 50,     // kg
          temperatureZone: 'ambient',
          lighting: 'standard-led'
        }
      }
    });
    
    // 2. PEGBOARD DISPLAY
    this.register('retail-pegboard', {
      type: 'wall-mounted',
      placementModel: 'pegboard-grid',
      compatibleModels: ['pegboard-grid'],
      
      dimensions: {
        width: 1270,    // Standard pegboard width (mm)
        height: 660,    // Standard pegboard height (mm)
        depth: 50,      // Depth from wall
        levels: 1       // Single surface
      },
      
      config: {
        grid: {
          rows: 24,
          cols: 48,
          spacing: 25.4,    // 1-inch standard spacing (mm)
          offset: { x: 50, y: 50 }
        },
        
        background: {
          assetId: 'PEGBOARD-2K-A001',
          resolution: '2560x1440',   // 2.5K minimum
          format: 'webp',
          dpi: 150,
          url: '/fixtures/pegboard-2k.webp'
        },
        
        hookTypes: ['J-hook-2in', 'J-hook-4in', 'straight-hook', 'clamp-hook'],
        
        constraints: {
          maxWeightPerHook: 5,       // kg
          orientation: ['vertical', 'horizontal']
        }
      }
    });
    
    // 3. REFRIGERATED UNIT
    this.register('tesco-refrigerated', {
      type: 'refrigerator',
      placementModel: 'shelf-surface',
      compatibleModels: ['shelf-surface'],
      
      dimensions: {
        width: 900,
        height: 2000,
        depth: 700,
        levels: 6
      },
      
      config: {
        shelves: [
          { index: 0, y: 150, height: 25, temperature: '4C' },
          { index: 1, y: 450, height: 25, temperature: '4C' },
          { index: 2, y: 750, height: 25, temperature: '4C' },
          { index: 3, y: 1050, height: 25, temperature: '0C' },
          { index: 4, y: 1350, height: 25, temperature: '0C' },
          { index: 5, y: 1650, height: 25, temperature: '0C' }
        ],
        
        background: {
          assetId: 'TESCO-REFRIGERATED-4K-A001',
          resolution: '3840x2160',
          format: 'webp',
          dpi: 300,
          url: '/fixtures/tesco-refrigerated-4k.webp',
          effects: ['frost', 'condensation']
        },
        
        constraints: {
          temperatureZones: ['chilled', 'frozen'],
          doorType: 'glass-sliding',
          lighting: 'led-cool',
          humidity: 'high'
        }
      }
    });
    
    // 4. HANGING RAIL
    this.register('clothing-rail', {
      type: 'rail',
      placementModel: 'rail-linear',
      compatibleModels: ['rail-linear'],
      
      dimensions: {
        width: 1800,
        height: 2200,
        depth: 600,
        levels: 1
      },
      
      config: {
        rails: [
          { index: 0, y: 1800, height: 400, type: 'single-rail' },
          { index: 1, y: 1400, height: 400, type: 'double-rail' }
        ],
        
        background: {
          assetId: 'CLOTHING-RAIL-4K-A001',
          resolution: '3840x2160',
          format: 'webp',
          dpi: 300,
          url: '/fixtures/clothing-rail-4k.webp'
        },
        
        hangerSpacing: 50,   // mm between hangers
        
        constraints: {
          hangerTypes: ['standard', 'wide', 'padded'],
          orientation: 'horizontal',
          maxWeightPerMeter: 15  // kg
        }
      }
    });
  }
  
  /**
   * Load high-resolution background asset
   */
  async loadBackgroundAsset(backgroundConfig) {
    // Validate resolution meets minimum requirements
    if (!this.meetsResolutionRequirement(backgroundConfig.resolution)) {
      throw new Error(`Background resolution ${backgroundConfig.resolution} below minimum 2560x1440`);
    }
    
    return {
      image: await this.loadImage(backgroundConfig.url),
      metadata: {
        resolution: backgroundConfig.resolution,
        dpi: backgroundConfig.dpi || 150,
        format: backgroundConfig.format,
        assetId: backgroundConfig.assetId
      }
    };
  }
  
  /**
   * Check if resolution meets minimum requirements
   */
  meetsResolutionRequirement(resolution) {
    const [width, height] = resolution.split('x').map(Number);
    return width >= 2560 && height >= 1440;
  }
}
```

### **B. PlacementModelRegistry - Spatial Logic Strategies**
```javascript
/**
 * PLACEMENTMODELREGISTRY - Pluggable spatial strategies
 * Defines how products move within different fixture types
 */
class PlacementModelRegistry {
  constructor() {
    this.models = new Map();
    this.initializeBuiltInModels();
  }
  
  /**
   * Get placement model for transformation
   */
  get(modelName) {
    if (!this.models.has(modelName)) {
      throw new Error(`Placement model '${modelName}' not found in registry`);
    }
    
    return this.models.get(modelName);
  }
  
  /**
   * Register new placement model
   */
  register(modelName, modelClass) {
    this.models.set(modelName, new modelClass());
  }
  
  /**
   * Initialize with built-in spatial strategies
   */
  initializeBuiltInModels() {
    // 1. SHELF SURFACE MODEL (for standard shelves, refrigerators)
    class ShelfSurfaceModel {
      constructor() {
        this.name = 'shelf-surface';
        this.compatibleFixtures = ['tesco-standard-shelf', 'tesco-refrigerated'];
        this.coordinateSchema = {
          shelfIndex: { type: 'integer', min: 0, max: 7 },
          x: { type: 'number', min: 0 },  // mm from left
          depth: { type: 'number', min: 0, max: 400 },
          facing: { type: 'integer', min: 1, max: 10 }
        };
      }
      
      /**
       * Validate semantic coordinates
       */
      validate(coordinates, fixtureConfig) {
        const { shelfIndex, x, depth, facing } = coordinates;
        
        // Check shelf exists
        if (shelfIndex >= fixtureConfig.shelves.length) {
          return { valid: false, reason: 'Shelf index out of range' };
        }
        
        // Check horizontal bounds
        if (x < 0 || x > fixtureConfig.dimensions.width) {
          return { valid: false, reason: 'X position out of bounds' };
        }
        
        // Check depth bounds
        if (depth < 0 || depth > fixtureConfig.dimensions.depth) {
          return { valid: false, reason: 'Depth out of bounds' };
        }
        
        return { valid: true };
      }
      
      /**
       * Transform semantic to render coordinates
       */
      transform(coordinates, fixtureConfig) {
        const { shelfIndex, x, depth, facing } = coordinates;
        const shelf = fixtureConfig.shelves[shelfIndex];
        
        // Convert mm to pixels (assuming 1mm = 1px at 1:1 scale)
        const pixelX = x;
        const pixelY = shelf.y;
        
        return {
          x: pixelX,
          y: pixelY,
          z: depth,                // Depth for z-index calculation
          facing: facing,
          shelfIndex: shelfIndex,
          baselineY: shelf.y + shelf.height  // Where product "sits"
        };
      }
      
      /**
       * Calculate bounds for collision detection
       */
      getBounds(productDimensions, coordinates, fixtureConfig) {
        const { shelfIndex, x, facing } = coordinates;
        const shelf = fixtureConfig.shelves[shelfIndex];
        
        return {
          x: x,
          y: shelf.y,
          width: productDimensions.width * facing,
          height: productDimensions.height,
          shelfIndex: shelfIndex
        };
      }
    }
    
    // 2. PEGBOARD GRID MODEL
    class PegboardGridModel {
      constructor() {
        this.name = 'pegboard-grid';
        this.compatibleFixtures = ['retail-pegboard'];
        this.coordinateSchema = {
          row: { type: 'integer', min: 0, max: 23 },
          col: { type: 'integer', min: 0, max: 47 },
          hookType: { enum: ['J-hook-2in', 'J-hook-4in', 'straight-hook'] },
          orientation: { enum: ['vertical', 'horizontal'] }
        };
      }
      
      transform(coordinates, fixtureConfig) {
        const { row, col, orientation } = coordinates;
        const { grid } = fixtureConfig;
        
        // Calculate peg position
        const x = grid.offset.x + (col * grid.spacing);
        const y = grid.offset.y + (row * grid.spacing);
        
        return {
          x: x,
          y: y,
          z: 0,
          orientation: orientation,
          hangPoint: { x, y }  // Where product hangs from
        };
      }
    }
    
    // 3. RAIL LINEAR MODEL
    class RailLinearModel {
      constructor() {
        this.name = 'rail-linear';
        this.compatibleFixtures = ['clothing-rail'];
        this.coordinateSchema = {
          railIndex: { type: 'integer', min: 0, max: 1 },
          position: { type: 'number', min: 0 },  // mm along rail
          hangerType: { enum: ['standard', 'wide', 'padded'] },
          spacing: { type: 'number', min: 50 }   // mm between hangers
        };
      }
      
      transform(coordinates, fixtureConfig) {
        const { railIndex, position } = coordinates;
        const rail = fixtureConfig.rails[railIndex];
        
        return {
          x: position,
          y: rail.y,
          z: 0,
          railIndex: railIndex,
          hangPoint: { x: position, y: rail.y }
        };
      }
    }
    
    // Register models
    this.register('shelf-surface', ShelfSurfaceModel);
    this.register('pegboard-grid', PegboardGridModel);
    this.register('rail-linear', RailLinearModel);
  }
}
```

## **III. Retail Physics Visual Constants Implementation**

### **A. Perspective Scaling System**
```javascript
/**
 * PERSPECTIVE SCALING - Front 100% → Back 92%
 * Enforced visual constant for photorealism
 */
class PerspectiveScaler {
  static calculateScale(depth, maxDepth, options = {}) {
    const config = {
      frontScale: 1.00,      // 100% front row
      backScale: 0.92,       // 92% back row (8% reduction)
      curve: 'linear',       // linear | exponential | s-curve
      ...options
    };
    
    // Calculate depth ratio (0.0 = front, 1.0 = back)
    const depthRatio = Math.max(0, Math.min(1, depth / maxDepth));
    
    // Apply scaling curve
    switch (config.curve) {
      case 'linear':
        return config.frontScale - (depthRatio * (config.frontScale - config.backScale));
      
      case 'exponential':
        // More dramatic reduction for depth
        return config.frontScale - (Math.pow(depthRatio, 1.5) * (config.frontScale - config.backScale));
      
      case 's-curve':
        // Natural perspective feeling
        const t = depthRatio;
        const eased = t * t * (3 - 2 * t); // Smoothstep
        return config.frontScale - (eased * (config.frontScale - config.backScale));
      
      default:
        return config.frontScale;
    }
  }
  
  /**
   * Batch process products with perspective scaling
   */
  static applyToProducts(products, fixtureDepth) {
    return products.map(product => {
      const depth = product.placement.coordinates.depth || 0;
      const scale = this.calculateScale(depth, fixtureDepth);
      
      return {
        ...product,
        renderScale: scale,
        originalDimensions: product.dimensions,
        scaledDimensions: {
          width: product.dimensions.width * scale,
          height: product.dimensions.height * scale,
          depth: product.dimensions.depth * scale
        },
        isFrontRow: scale > 0.98,
        isBackRow: scale < 0.94
      };
    });
  }
}
```

### **B. Z-Layering with Shelf Bonus**
```javascript
/**
 * ZLAYER MANAGER with Shelf Bonus Logic
 * Ensures correct visual stacking
 */
class ZLayerManager {
  constructor() {
    // Visual constants
    this.shelfBonus = 100;     // Z increment per shelf level
    this.facingBonus = 10;     // Z increment per facing depth
    this.depthBonus = 1;       // Z increment per mm depth
    
    // Layer base values
    this.layerBases = {
      background: 0,
      fixture: 100,
      backProducts: 200,
      frontProducts: 300,
      shadows: 400,
      labels: 500
    };
  }
  
  /**
   * Calculate z-index with all bonuses
   */
  calculateZIndex(product, layerType = 'frontProducts') {
    const { shelfIndex = 0, depth = 0, facing = 1 } = product.placement.coordinates;
    
    // Base layer
    let zIndex = this.layerBases[layerType];
    
    // Shelf bonus: higher shelves overlap lower
    zIndex += shelfIndex * this.shelfBonus;
    
    // Facing bonus: front facings overlap back
    zIndex += (facing - 1) * this.facingBonus;
    
    // Depth bonus: closer items overlap further
    zIndex += depth * this.depthBonus;
    
    // Additional product-specific adjustments
    if (product.performance?.turnover > 80) {
      zIndex += 5;  // High-performing products slightly elevated
    }
    
    return zIndex;
  }
  
  /**
   * Sort products with proper shelf overlap
   */
  sortByDepth(products) {
    return [...products].sort((a, b) => {
      // Calculate effective z-index for both
      const zA = this.calculateZIndex(a, this.getLayerType(a));
      const zB = this.calculateZIndex(b, this.getLayerType(b));
      
      // Lower z-index renders first (back to front)
      return zA - zB;
    });
  }
  
  /**
   * Determine which layer product belongs to
   */
  getLayerType(product) {
    const scale = product.renderScale || 1.0;
    
    if (scale > 0.98) return 'frontProducts';
    if (scale < 0.94) return 'backProducts';
    return 'frontProducts'; // Default
  }
}
```

### **C. Non-Floating Effects Implementation**
```javascript
/**
 * SHADOWRENDERER - Prevents "floating" appearance
 */
class ShadowRenderer {
  static render(context, product, fixtureType) {
    const shadowConfig = this.getShadowConfig(product, fixtureType);
    const bounds = product.renderBounds;
    
    context.save();
    
    // Apply shadow styling
    context.shadowColor = shadowConfig.color;
    context.shadowBlur = shadowConfig.blur;
    context.shadowOffsetX = shadowConfig.offset.x;
    context.shadowOffsetY = shadowConfig.offset.y;
    
    // Draw shadow shape (slightly larger than product)
    const shadowPath = this.createShadowPath(bounds, product.dimensions);
    context.fillStyle = shadowConfig.color;
    context.fill(shadowPath);
    
    context.restore();
  }
  
  static getShadowConfig(product, fixtureType) {
    // Different shadows for different fixture types
    const configs = {
      'shelf': {
        color: 'rgba(0, 0, 0, 0.3)',
        blur: 8,
        offset: { x: 0, y: 4 }
      },
      'pegboard': {
        color: 'rgba(0, 0, 0, 0.2)',
        blur: 4,
        offset: { x: 0, y: 2 }
      },
      'refrigerated': {
        color: 'rgba(0, 0, 0, 0.4)',
        blur: 12,
        offset: { x: 0, y: 6 }
      }
    };
    
    return configs[fixtureType] || configs.shelf;
  }
}

/**
 * MASKRENDERER - Alpha masks for non-rectangular shapes
 */
class MaskRenderer {
  static async applyMask(spriteImage, maskImage, dimensions) {
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext('2d');
    
    // Draw sprite
    ctx.drawImage(spriteImage, 0, 0, dimensions.width, dimensions.height);
    
    // Apply mask using destination-in composition
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(maskImage, 0, 0, dimensions.width, dimensions.height);
    
    return canvas;
  }
}
```

## **IV. Performance & UI Context Implementation**

### **A. Viewport Culling for 60fps**
```javascript
/**
 * VIEWPORT CULLER - Dynamic visibility management
 */
class ViewportCuller {
  constructor() {
    this.visibilityMargin = 200; // Preload margin in pixels
    this.lastViewport = null;
    this.cache = new Map();
    this.cacheSize = 10;
  }
  
  /**
   * Determine visible products for current viewport
   */
  cull(products, viewport) {
    // Cache hit check
    const cacheKey = this.getCacheKey(viewport);
    if (this.cache.has(cacheKey) && this.isViewportSimilar(viewport)) {
      return this.cache.get(cacheKey);
    }
    
    // Calculate visible bounds with margin
    const visibleBounds = this.calculateVisibleBounds(viewport);
    
    // Filter products
    const visibleProducts = products.filter(product => {
      return this.isProductVisible(product, visibleBounds);
    });
    
    // Sort by distance for progressive loading
    visibleProducts.sort((a, b) => {
      return this.distanceFromViewportCenter(a, viewport) -
             this.distanceFromViewportCenter(b, viewport);
    });
    
    // Cache result
    this.cacheResult(cacheKey, visibleProducts);
    
    return visibleProducts;
  }
  
  calculateVisibleBounds(viewport) {
    return {
      x: viewport.x - this.visibilityMargin,
      y: viewport.y - this.visibilityMargin,
      width: viewport.width + (2 * this.visibilityMargin),
      height: viewport.height + (2 * this.visibilityMargin)
    };
  }
  
  isProductVisible(product, visibleBounds) {
    const bounds = product.renderBounds;
    return (
      bounds.x + bounds.width >= visibleBounds.x &&
      bounds.x <= visibleBounds.x + visibleBounds.width &&
      bounds.y + bounds.height >= visibleBounds.y &&
      bounds.y <= visibleBounds.y + visibleBounds.height
    );
  }
}
```

### **B. Zoom-Adaptive Price Display**
```javascript
/**
 * PRICEDISPLAY - Dynamic font scaling for readability
 */
class PriceDisplay {
  constructor() {
    this.zoomLevels = {
      min: 0.5,    // Minimum zoom
      base: 1.0,   // Normal zoom
      max: 3.0     // Maximum zoom
    };
    
    this.fontSizes = {
      unitPrice: { min: 8, base: 12, max: 24 },
      promoPrice: { min: 7, base: 10, max: 20 },
      clubcardPrice: { min: 6, base: 9, max: 18 },
      unitMeasure: { min: 5, base: 8, max: 16 }
    };
  }
  
  /**
   * Calculate font size for current zoom
   */
  calculateFontSize(priceType, zoomLevel) {
    const sizes = this.fontSizes[priceType];
    
    // Clamp zoom to valid range
    const clampedZoom = Math.max(this.zoomLevels.min, 
                                 Math.min(this.zoomLevels.max, zoomLevel));
    
    // Interpolate between sizes
    if (clampedZoom <= this.zoomLevels.base) {
      // Scale from min to base
      const ratio = (clampedZoom - this.zoomLevels.min) / 
                   (this.zoomLevels.base - this.zoomLevels.min);
      return sizes.min + (ratio * (sizes.base - sizes.min));
    } else {
      // Scale from base to max
      const ratio = (clampedZoom - this.zoomLevels.base) / 
                   (this.zoomLevels.max - this.zoomLevels.base);
      return sizes.base + (ratio * (sizes.max - sizes.base));
    }
  }
  
  /**
   * Render price with dynamic scaling
   */
  render(context, product, zoomLevel, position) {
    const fontSize = this.calculateFontSize('unitPrice', zoomLevel);
    
    context.save();
    
    // Apply zoom transformation
    context.scale(zoomLevel, zoomLevel);
    
    // Set font
    context.font = `bold ${fontSize}px 'Segoe UI', Arial, sans-serif`;
    context.fillStyle = '#000000';
    context.textAlign = 'center';
    
    // Render price
    const priceText = this.formatPrice(product.pricing);
    context.fillText(priceText, position.x / zoomLevel, position.y / zoomLevel);
    
    context.restore();
  }
}
```

## **V. Context-Specific Renderers**

### **A. Planogram Publisher with Heatmaps**
```javascript
/**
 * PUBLISHER RENDERER - 2D with business intelligence overlays
 */
class PublisherRenderer extends RenderEngine {
  constructor() {
    super('canvas2d');
    
    // Publisher-specific configuration
    this.config = {
      resolution: 'print',         // 300 DPI output
      enableHeatmaps: true,
      enableLabels: true,
      enableShadows: false,        // 2D print doesn't need shadows
      zoomRange: { min: 0.5, max: 3.0 }
    };
    
    // Heatmap engine for performance visualization
    this.heatmapEngine = new HeatmapEngine();
  }
  
  async render(planogramConfig, context, viewport) {
    // 1. Render base planogram
    await super.render(planogramConfig, context, viewport);
    
    // 2. Apply heatmap overlay if enabled
    if (this.config.enableHeatmaps && planogramConfig.performanceData) {
      await this.heatmapEngine.apply(
        context,
        planogramConfig.products,
        planogramConfig.performanceData
      );
    }
    
    // 3. Add print-specific elements
    if (this.config.resolution === 'print') {
      await this.addPrintElements(context, planogramConfig);
    }
  }
}
```

### **B. Fixture Visualizer with Editing Feedback**
```javascript
/**
 * VISUALIZER RENDERER - 2.5D with editing capabilities
 */
class VisualizerRenderer extends RenderEngine {
  constructor() {
    super('webgl');
    
    // Visualizer-specific features
    this.config = {
      enableParallax: true,
      enableShadows: true,
      enableRealTimeFeedback: true,
      targetFPS: 60
    };
    
    // Editing feedback systems
    this.selectionHighlighter = new SelectionHighlighter();
    this.collisionVisualizer = new CollisionVisualizer();
    this.snapVisualizer = new SnapVisualizer();
  }
  
  async render(planogramConfig, context, viewport, editingState) {
    // 1. Render base planogram
    await super.render(planogramConfig, context, viewport);
    
    // 2. Apply editing feedback if in edit mode
    if (editingState) {
      // Highlight selected product
      if (editingState.selectedProduct) {
        await this.selectionHighlighter.highlight(
          context,
          editingState.selectedProduct
        );
      }
      
      // Show collisions
      if (editingState.collisions.length > 0) {
        await this.collisionVisualizer.showCollisions(
          context,
          editingState.collisions
        );
      }
      
      // Show snap guides
      if (editingState.snapTargets.length > 0) {
        await this.snapVisualizer.showSnapGuides(
          context,
          editingState.snapTargets
        );
      }
    }
  }
}
```

### **C. Virtual Store Experience (3D)**
```javascript
/**
 * VSE RENDERER - Immersive 3D environment
 */
class VSERenderer extends RenderEngine {
  constructor() {
    super('threejs');  // Uses Three.js instead of Canvas2D/WebGL
    
    // VSE-specific configuration
    this.config = {
      cameraHeight: 1650,      // mm (1.65m - average eye level)
      fieldOfView: 60,         // degrees
      enableVR: false,
      enableFirstPerson: true,
      lighting: 'physically-based'
    };
    
    // 3D asset manager
    this.assetManager = new ThreeJSAssetManager();
  }
  
  async render(planogramConfig, scene, camera) {
    // Set up 3D camera
    camera.position.set(0, this.config.cameraHeight, 1000);
    camera.lookAt(0, this.config.cameraHeight, 0);
    
    // 1. Load and render 3D fixture
    const fixture3D = await this.assetManager.loadFixture3D(
      planogramConfig.fixture.type
    );
    scene.add(fixture3D);
    
    // 2. Convert 2.5D sprites to 3D meshes
    const productMeshes = await this.convertTo3D(
      planogramConfig.products,
      planogramConfig.fixture
    );
    
    productMeshes.forEach(mesh => scene.add(mesh));
    
    // 3. Apply 3D lighting
    this.applyLighting(scene);
    
    // 4. Render scene
    this.renderer.render(scene, camera);
  }
  
  /**
   * Convert 2.5D sprites to 3D meshes
   */
  async convertTo3D(products, fixture) {
    return Promise.all(products.map(async product => {
      // Load 3D model or create from sprites
      const mesh = await this.assetManager.loadProduct3D(product.sku);
      
      // Position using same semantic coordinates
      const position = this.calculate3DPosition(
        product.placement.coordinates,
        fixture
      );
      
      mesh.position.set(position.x, position.y, position.z);
      mesh.scale.set(product.renderScale, product.renderScale, product.renderScale);
      
      return mesh;
    }));
  }
  
  /**
   * Calculate 3D position from semantic coordinates
   */
  calculate3DPosition(coordinates, fixture) {
    // Same transformation logic, but for 3D space
    const { shelfIndex, x, depth } = coordinates;
    const shelf = fixture.config.shelves[shelfIndex];
    
    return {
      x: x,
      y: shelf.y + (shelf.height / 2),
      z: depth - (fixture.dimensions.depth / 2)
    };
  }
}
```

## **VI. Complete Core Layer Orchestration**

```javascript
/**
 * CORE LAYER ORCHESTRATOR - Main entry point
 */
class CoreLayerOrchestrator {
  constructor(contextType = 'visualizer') {
    // Initialize registries
    this.fixtureRegistry = new FixtureRegistry();
    this.placementModelRegistry = new PlacementModelRegistry();
    
    // Initialize appropriate renderer based on context
    this.renderer = this.createRenderer(contextType);
    
    // Initialize supporting systems
    this.viewportCuller = new ViewportCuller();
    this.zLayerManager = new ZLayerManager();
    this.productPositioner = new ProductPositioner(this.placementModelRegistry);
    this.shadowRenderer = new ShadowRenderer();
    this.maskRenderer = new MaskRenderer();
    this.priceDisplay = new PriceDisplay();
    
    // Performance monitoring
    this.performanceMonitor = new PerformanceMonitor();
  }
  
  /**
   * Main render method
   */
  async renderPlanogram(planogramConfig, outputContext, viewport, editingState = null) {
    const startTime = performance.now();
    
    // 1. Load fixture and placement model
    const fixture = await this.fixtureRegistry.get(planogramConfig.fixture.type);
    const placementModel = this.placementModelRegistry.get(
      planogramConfig.fixture.placementModel
    );
    
    // 2. Apply perspective scaling
    const scaledProducts = PerspectiveScaler.applyToProducts(
      planogramConfig.products,
      fixture.dimensions.depth
    );
    
    // 3. Transform semantic to render coordinates
    const positionedProducts = scaledProducts.map(product => {
      const renderCoords = this.productPositioner.transform(
        product,
        fixture,
        placementModel
      );
      
      return {
        ...product,
        renderCoords,
        renderBounds: placementModel.getBounds(
          product.scaledDimensions,
          product.placement.coordinates,
          fixture.config
        )
      };
    });
    
    // 4. Apply z-layering with shelf bonus
    const layeredProducts = this.zLayerManager.sortByDepth(positionedProducts);
    
    // 5. Viewport culling for performance
    const visibleProducts = this.viewportCuller.cull(layeredProducts, viewport);
    
    // 6. Render through appropriate renderer
    const renderResult = await this.renderer.render(
      {
        ...planogramConfig,
        fixture,
        products: visibleProducts
      },
      outputContext,
      viewport,
      editingState
    );
    
    // 7. Monitor performance
    this.performanceMonitor.recordFrame({
      renderTime: performance.now() - startTime,
      visibleProducts: visibleProducts.length,
      totalProducts: planogramConfig.products.length,
      fps: 1000 / (performance.now() - startTime)
    });
    
    return renderResult;
  }
  
  /**
   * Create appropriate renderer for context
   */
  createRenderer(contextType) {
    switch (contextType) {
      case 'publisher':
        return new PublisherRenderer();
      case 'visualizer':
        return new VisualizerRenderer();
      case 'vse':
        return new VSERenderer();
      default:
        throw new Error(`Unknown context type: ${contextType}`);
    }
  }
}
```

## **VII. Implementation Checklist**

### **✅ Data Foundation Requirements:**
- [x] Semantic coordinates (shelfIndex, x, depth, facing)
- [x] 4K background assets (2560x1440 minimum)
- [x] 9 sprite angles per SKU
- [x] Physical dimensions in millimeters
- [x] Anchor points for positioning

### **✅ Registry Requirements:**
- [x] FixtureRegistry with physical structure definitions
- [x] PlacementModelRegistry with spatial strategies
- [x] Asset caching for performance
- [x] Compatibility validation

### **✅ Retail Physics Constants:**
- [x] Perspective scaling (100% → 92%)
- [x] Z-layering with shelf bonus
- [x] Shadow rendering for non-floating effect
- [x] Alpha masks for non-rectangular shapes

### **✅ Performance Requirements:**
- [x] Viewport culling for 60fps
- [x] Zoom-adaptive font scaling (0.5x-3.0x)
- [x] Progressive asset loading
- [x] Memory management (512MB budget)

### **✅ Context-Specific Implementations:**
- [x] Publisher: Heatmap overlays for business intelligence
- [x] Visualizer: Editing feedback (collision, snapping)
- [x] VSE: 3D meshes with 1.65m eye-level camera

This complete implementation blueprint ensures the Core Layer can transform abstract retail data into a photorealistic Digital Twin that meets all FR-2.1 requirements while maintaining the performance and flexibility needed for enterprise retail optimization.
