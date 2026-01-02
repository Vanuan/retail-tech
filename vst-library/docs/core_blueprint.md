# **Core Layer Processing & Renderer Layer Separation Architecture**

## **I. Core Layer Processing (FR-2.1 Data Prep)**
### **Transforms L1-L3 data into render-ready instances**

```javascript
/**
 * CORE LAYER PROCESSING - Stateless data preparation pipeline
 * Transforms semantic data into render-ready instances WITHOUT actual rendering
 */
class CoreLayerProcessor {
  constructor(fixtureRegistry, placementModelRegistry, metadataStore) {
    this.registries = { fixtureRegistry, placementModelRegistry, metadataStore };
    this.processors = [
      new ProductInstanceGenerator(),
      new CorePerspectiveScaler(),
      new CoreZLayerManager(),
      new CoreProductPositioner(),
      new ShadowTypeDeterminer(),
      new MaskRequiredChecker()
    ];
    this.validator = new ValidationRulesProcessor();
  }

  /**
   * Main processing pipeline: L1-L3 → Render-Ready Instances
   */
  async processPlanogram(planogramConfig) {
    // PHASE 1: Registry lookups
    const fixtureDef = await this.registries.fixtureRegistry.get(
      planogramConfig.fixture.type
    );
    const placementModel = this.registries.placementModelRegistry.get(
      planogramConfig.fixture.placementModel
    );

    // PHASE 2: Process each product through pipeline
    const renderInstances = [];
    
    for (const product of planogramConfig.products) {
      // Start with base product data
      let instance = {
        id: product.id,
        sku: product.sku,
        sourceData: product,
        fixture: fixtureDef,
        placementModel: placementModel
      };

      // Process through each preparer
      for (const processor of this.processors) {
        instance = await processor.process(instance, fixtureDef, placementModel);
      }

      // Validate final instance
      const validation = this.validator.validate(instance);
      if (validation.valid) {
        renderInstances.push(instance);
      } else {
        console.warn(`Invalid instance ${instance.id}:`, validation.errors);
      }
    }

    return {
      renderInstances,
      fixture: fixtureDef,
      metadata: {
        totalInstances: renderInstances.length,
        validInstances: renderInstances.length,
        invalidCount: planogramConfig.products.length - renderInstances.length,
        processingTime: Date.now()
      }
    };
  }
}

// ====================================================================
// CORE PROCESSING COMPONENTS (Stateless Data Transformations)
// ====================================================================

/**
 * PRODUCT INSTANCE GENERATOR
 * Combines L1-L3 data into prepared instances
 */
class ProductInstanceGenerator {
  async process(instance, fixture, placementModel) {
    // 1. Load product metadata
    const metadata = await instance.registries.metadataStore.getProductMetadata(
      instance.sku
    );

    // 2. Combine all data sources
    return {
      ...instance,
      metadata,
      
      // Layer 1: Data Layer
      physicalDimensions: metadata.dimensions.physical, // mm
      visualDimensions: metadata.dimensions.visual,     // pixels
      anchorPoint: metadata.dimensions.visual.anchor,   // {x: 0.5, y: 1.0}
      
      // Layer 2: Universal Representation
      semanticCoordinates: instance.sourceData.placement.coordinates,
      constraints: instance.sourceData.placement.constraints,
      
      // Layer 3: Facings & Pyramid
      facingData: this.extractFacingData(instance.sourceData),
      pyramidData: this.extractPyramidData(instance.sourceData),
      
      // Performance data for heatmaps (if available)
      performance: instance.sourceData.performance,
      
      // Asset references
      assets: {
        spriteVariants: metadata.visualProperties.spriteVariants || 9,
        maskUrl: metadata.visualProperties.maskUrl,
        shadowConfig: metadata.visualProperties.shadowType || 'standard'
      }
    };
  }

  extractFacingData(product) {
    if (!product.placement.facings) return null;
    
    return {
      horizontal: product.placement.facings.horizontal || 1,
      vertical: product.placement.facings.vertical || 1,
      totalFacings: (product.placement.facings.horizontal || 1) * 
                   (product.placement.facings.vertical || 1)
    };
  }
}

/**
 * CORE PERSPECTIVE SCALER
 * Calculates renderScale, depthRatio based on depth
 * Front-row: 100%, Back-row: 92% (8% reduction)
 */
class CorePerspectiveScaler {
  process(instance) {
    const { depth = 0 } = instance.semanticCoordinates;
    const maxDepth = instance.fixture.dimensions.depth || 400;
    
    // Calculate depth ratio (0.0 = front, 1.0 = back)
    const depthRatio = Math.min(1.0, Math.max(0.0, depth / maxDepth));
    
    // Apply perspective scaling
    const renderScale = this.calculatePerspectiveScale(depthRatio);
    
    return {
      ...instance,
      depthRatio,
      renderScale,
      scaledDimensions: {
        width: instance.visualDimensions.width * renderScale,
        height: instance.visualDimensions.height * renderScale,
        depth: instance.physicalDimensions.depth * renderScale
      },
      visualProperties: {
        ...instance.visualProperties,
        isFrontRow: depthRatio < 0.33,
        isMiddleRow: depthRatio >= 0.33 && depthRatio <= 0.66,
        isBackRow: depthRatio > 0.66,
        depthCategory: this.getDepthCategory(depthRatio)
      }
    };
  }

  calculatePerspectiveScale(depthRatio) {
    // Front: 100%, Back: 92% (linear interpolation)
    const frontScale = 1.00;
    const backScale = 0.92;
    
    return frontScale - (depthRatio * (frontScale - backScale));
  }

  getDepthCategory(depthRatio) {
    if (depthRatio < 0.33) return 'front';
    if (depthRatio < 0.66) return 'middle';
    return 'back';
  }
}

/**
 * CORE Z-LAYER MANAGER
 * Calculates final zIndex with shelf/facing bonuses
 */
class CoreZLayerManager {
  process(instance) {
    const { shelfIndex = 0, facing = 1 } = instance.semanticCoordinates;
    
    // Base z-index calculation
    let zIndex = 0;
    
    // Shelf bonus: higher shelves render above lower
    zIndex += shelfIndex * 100; // 100 per shelf level
    
    // Facing bonus: front facings render above back
    zIndex += (facing - 1) * 10; // 10 per facing depth
    
    // Depth adjustment
    zIndex += Math.floor(instance.depthRatio * 50); // 0-50 based on depth
    
    // Product type bonus (e.g., promotional items stand out)
    if (instance.sourceData.pricing?.promotionalPrice) {
      zIndex += 5;
    }
    
    return {
      ...instance,
      zIndex,
      zLayerProperties: {
        baseZ: zIndex,
        shelfContribution: shelfIndex * 100,
        facingContribution: (facing - 1) * 10,
        depthContribution: Math.floor(instance.depthRatio * 50),
        finalZIndex: zIndex
      }
    };
  }
}

/**
 * CORE PRODUCT POSITIONER
 * Calculates final renderCoordinates & bounds using PlacementModel
 */
class CoreProductPositioner {
  process(instance) {
    const placementModel = instance.placementModel;
    
    // Transform semantic to base render coordinates
    const baseCoords = placementModel.transform(
      instance.semanticCoordinates,
      instance.fixture.config
    );
    
    // Apply perspective scaling to position
    const scaledCoords = this.applyScaling(baseCoords, instance);
    
    // Calculate precise bounds for rendering and collision
    const bounds = this.calculateBounds(instance, scaledCoords);
    
    // Calculate baseline (where product "sits" on surface)
    const baseline = this.calculateBaseline(instance, scaledCoords);
    
    return {
      ...instance,
      renderCoordinates: {
        ...scaledCoords,
        baseline,
        anchorPoint: instance.anchorPoint,
        rotation: 0, // Base rotation, can be modified by renderer
        scale: instance.renderScale
      },
      renderBounds: bounds,
      collisionBounds: this.calculateCollisionBounds(bounds, instance)
    };
  }

  applyScaling(baseCoords, instance) {
    // Adjust position based on scale and anchor point
    const scaledWidth = instance.visualDimensions.width * instance.renderScale;
    const scaledHeight = instance.visualDimensions.height * instance.renderScale;
    
    // Center adjustment based on anchor point
    const anchorX = instance.anchorPoint.x || 0.5;
    const anchorY = instance.anchorPoint.y || 1.0;
    
    const offsetX = (instance.visualDimensions.width - scaledWidth) * anchorX;
    const offsetY = (instance.visualDimensions.height - scaledHeight) * anchorY;
    
    return {
      ...baseCoords,
      x: baseCoords.x + offsetX,
      y: baseCoords.y + offsetY,
      width: scaledWidth,
      height: scaledHeight
    };
  }

  calculateBounds(instance, coords) {
    return {
      x: coords.x,
      y: coords.y,
      width: coords.width,
      height: coords.height,
      center: {
        x: coords.x + (coords.width / 2),
        y: coords.y + (coords.height / 2)
      }
    };
  }
}

/**
 * SHADOW TYPE DETERMINER
 * Determines shadow needs based on product and fixture type
 */
class ShadowTypeDeterminer {
  process(instance) {
    const shadowConfig = this.determineShadowConfig(instance);
    
    return {
      ...instance,
      shadowProperties: {
        enabled: shadowConfig.enabled,
        type: shadowConfig.type,
        intensity: shadowConfig.intensity,
        offset: shadowConfig.offset,
        blur: shadowConfig.blur,
        color: shadowConfig.color,
        needsShadow: this.needsShadow(instance)
      }
    };
  }

  determineShadowConfig(instance) {
    const fixtureType = instance.fixture.type;
    const productType = instance.metadata.classification?.category;
    
    // Different shadows for different contexts
    const configs = {
      'shelf': {
        enabled: true,
        type: 'drop',
        intensity: 0.7,
        offset: { x: 0, y: 4 },
        blur: 8,
        color: 'rgba(0, 0, 0, 0.3)'
      },
      'pegboard': {
        enabled: true,
        type: 'contact',
        intensity: 0.5,
        offset: { x: 0, y: 2 },
        blur: 4,
        color: 'rgba(0, 0, 0, 0.2)'
      },
      'refrigerated': {
        enabled: true,
        type: 'frost',
        intensity: 0.6,
        offset: { x: 0, y: 6 },
        blur: 12,
        color: 'rgba(0, 0, 0, 0.25)'
      }
    };
    
    return configs[fixtureType] || configs.shelf;
  }

  needsShadow(instance) {
    // Products on bottom shelf might not need shadows
    const shelfIndex = instance.semanticCoordinates.shelfIndex || 0;
    if (shelfIndex === 0) return false;
    
    // Hanging products need different shadows
    if (instance.fixture.type === 'pegboard') return true;
    
    // Default: needs shadow
    return true;
  }
}

/**
 * MASK REQUIRED CHECKER
 * Determines if mask is needed based on product shape
 */
class MaskRequiredChecker {
  process(instance) {
    const needsMask = this.determineIfMaskNeeded(instance);
    
    return {
      ...instance,
      maskProperties: {
        required: needsMask,
        maskUrl: needsMask ? instance.assets.maskUrl : null,
        transparency: instance.metadata.visualProperties?.hasTransparency || false,
        maskType: this.getMaskType(instance),
        compositeOperation: 'destination-in'
      }
    };
  }

  determineIfMaskNeeded(instance) {
    const productType = instance.metadata.classification?.category;
    
    // Products that typically need masks
    const maskedProducts = [
      'bottles', 'jars', 'irregular', 'organic-shapes',
      'clothing', 'soft-goods', 'fresh-produce'
    ];
    
    // Products that don't need masks
    const unmaskedProducts = [
      'boxes', 'cubes', 'rectangular', 'canned-goods',
      'packaged', 'cartons'
    ];
    
    if (unmaskedProducts.some(type => productType?.includes(type))) {
      return false;
    }
    
    return maskedProducts.some(type => productType?.includes(type)) || 
           instance.metadata.visualProperties?.hasTransparency;
  }

  getMaskType(instance) {
    if (instance.metadata.visualProperties?.hasTransparency) {
      return 'alpha-channel';
    }
    
    const productType = instance.metadata.classification?.category;
    if (productType?.includes('bottle') || productType?.includes('jar')) {
      return 'silhouette';
    }
    
    return 'outline';
  }
}

/**
 * VALIDATION RULES PROCESSOR
 * Applies L2 validation rules to instances
 */
class ValidationRulesProcessor {
  validate(instance) {
    const errors = [];
    const warnings = [];
    
    // 1. Bounds validation
    if (!this.validateBounds(instance)) {
      errors.push('Product exceeds fixture bounds');
    }
    
    // 2. Shelf existence validation
    if (!this.validateShelf(instance)) {
      errors.push('Invalid shelf index');
    }
    
    // 3. Facings validation
    if (!this.validateFacings(instance)) {
      warnings.push('Facing count outside recommended range');
    }
    
    // 4. Scale validation
    if (!this.validateScale(instance)) {
      warnings.push('Scale outside optimal range');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      canRender: errors.length === 0
    };
  }

  validateBounds(instance) {
    const bounds = instance.renderBounds;
    const fixtureWidth = instance.fixture.dimensions.width;
    const fixtureHeight = instance.fixture.dimensions.height;
    
    return (
      bounds.x >= 0 &&
      bounds.x + bounds.width <= fixtureWidth &&
      bounds.y >= 0 &&
      bounds.y + bounds.height <= fixtureHeight
    );
  }
}
```

## **II. Renderer Layer (Core Layer - FR-2.1 Drawing Engine)**
### **Consumes prepared instances and performs actual rendering**

```javascript
/**
 * RENDERER LAYER - Platform-specific drawing engine
 * Consumes prepared instances from Core Layer Processing
 */
class RendererLayer {
  constructor(contextType = 'canvas2d') {
    this.contextType = contextType;
    this.renderEngine = this.createRenderEngine(contextType);
    
    // Initialize subsystems
    this.visualOrchestration = new VisualOrchestrationSubsystem();
    this.spriteExecution = new SpriteExecutionSubsystem();
    this.retailMetadata = new RetailMetadataSubsystem();
    this.contextRenderer = this.createContextRenderer(contextType);
    
    // Performance systems
    this.viewportCuller = new ViewportCuller();
    this.performanceMonitor = new PerformanceMonitor();
    
    // State
    this.currentViewport = null;
    this.currentZoom = 1.0;
    this.renderQueue = [];
  }

  /**
   * Main render method - Consumes prepared instances
   */
  async render(processedPlanogram, outputContext, viewport, editingState = null) {
    const startTime = performance.now();
    
    // Update viewport
    this.currentViewport = viewport;
    this.currentZoom = viewport.zoom || 1.0;
    
    // 1. Viewport culling (optimization)
    const visibleInstances = this.viewportCuller.cull(
      processedPlanogram.renderInstances,
      viewport
    );
    
    // 2. Set up render context
    await this.renderEngine.initialize(outputContext, {
      width: viewport.width,
      height: viewport.height,
      dpi: viewport.dpi || 96,
      clearColor: '#ffffff'
    });
    
    // 3. Execute rendering pipeline
    const renderResult = await this.executeRenderPipeline(
      visibleInstances,
      processedPlanogram.fixture,
      outputContext,
      viewport,
      editingState
    );
    
    // 4. Monitor performance
    this.performanceMonitor.recordFrame({
      renderTime: performance.now() - startTime,
      visibleInstances: visibleInstances.length,
      totalInstances: processedPlanogram.renderInstances.length,
      drawCalls: renderResult.drawCalls,
      memory: performance.memory?.usedJSHeapSize || 0
    });
    
    // 5. Apply context-specific overlays
    await this.contextRenderer.applyOverlays(
      outputContext,
      visibleInstances,
      viewport,
      editingState
    );
    
    return renderResult;
  }

  async executeRenderPipeline(instances, fixture, context, viewport, editingState) {
    let drawCalls = 0;
    
    // PHASE 1: Render fixture background
    if (fixture.background) {
      await this.renderFixtureBackground(fixture, context, viewport);
      drawCalls++;
    }
    
    // PHASE 2: Sort instances by z-index for correct draw order
    const sortedInstances = this.visualOrchestration.zLayerManager.sortByZIndex(instances);
    
    // PHASE 3: Render each instance
    for (const instance of sortedInstances) {
      const instanceResult = await this.renderInstance(instance, context, viewport);
      drawCalls += instanceResult.drawCalls;
    }
    
    // PHASE 4: Render retail metadata
    drawCalls += await this.retailMetadata.renderAll(instances, context, viewport);
    
    // PHASE 5: Apply editing feedback if in edit mode
    if (editingState) {
      drawCalls += await this.renderEditingFeedback(instances, context, editingState);
    }
    
    return { drawCalls, success: true };
  }

  async renderInstance(instance, context, viewport) {
    let drawCalls = 0;
    
    // 1. Apply transforms (position, scale, rotation)
    this.visualOrchestration.productPositioner.applyTransforms(
      context,
      instance.renderCoordinates
    );
    
    // 2. Render shadow if needed
    if (instance.shadowProperties?.enabled) {
      await this.spriteExecution.shadowRenderer.render(
        context,
        instance,
        viewport
      );
      drawCalls++;
    }
    
    // 3. Render sprite with appropriate angle
    const spriteResult = await this.spriteExecution.productSprite.render(
      context,
      instance,
      viewport
    );
    drawCalls += spriteResult.drawCalls;
    
    // 4. Apply mask if needed
    if (instance.maskProperties?.required) {
      await this.spriteExecution.maskRenderer.apply(
        context,
        instance,
        viewport
      );
      drawCalls++;
    }
    
    // 5. Reset transforms
    context.resetTransform();
    
    return { drawCalls, instanceId: instance.id };
  }
}
```

## **III. Render Engine Subsystem Implementations**

```javascript
// ====================================================================
// RENDER ENGINE SUBSYSTEM (Platform-specific implementations)
// ====================================================================

class RenderEngine {
  constructor(type) {
    this.type = type;
    this.context = null;
    this.config = {
      targetFPS: 60,
      maxMemoryMB: 512,
      enableHardwareAcceleration: true
    };
  }

  initialize(outputContext, options) {
    this.context = outputContext;
    
    switch (this.type) {
      case 'canvas2d':
        return this.initializeCanvas2D(options);
      case 'webgl':
        return this.initializeWebGL(options);
      case 'threejs':
        return this.initializeThreeJS(options);
      default:
        throw new Error(`Unsupported render engine type: ${this.type}`);
    }
  }

  initializeCanvas2D(options) {
    const ctx = this.context;
    
    // Set up 2D canvas context
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalCompositeOperation = 'source-over';
    
    // Clear canvas
    ctx.clearRect(0, 0, options.width, options.height);
    
    // Set background if specified
    if (options.clearColor) {
      ctx.fillStyle = options.clearColor;
      ctx.fillRect(0, 0, options.width, options.height);
    }
  }
}

/**
 * VIEWPORT CULLER (Renderer Version)
 * Consumes prepared instances from Core Layer
 */
class ViewportCuller {
  constructor() {
    this.cache = new Map();
    this.visibilityMargin = 300; // pixels
    this.frameHistory = [];
  }

  cull(instances, viewport) {
    const cacheKey = this.getCacheKey(viewport);
    
    // Cache hit check
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached.timestamp > Date.now() - 100) { // 100ms cache validity
        return cached.instances;
      }
    }
    
    // Calculate expanded viewport for preloading
    const expandedBounds = this.expandViewport(viewport);
    
    // Filter instances
    const visibleInstances = instances.filter(instance => {
      return this.isInstanceVisible(instance, expandedBounds);
    });
    
    // Sort by distance from viewport center
    visibleInstances.sort((a, b) => {
      return this.distanceToViewportCenter(a, viewport) -
             this.distanceToViewportCenter(b, viewport);
    });
    
    // Cache result
    this.cache.set(cacheKey, {
      instances: visibleInstances,
      timestamp: Date.now(),
      viewport: { ...viewport }
    });
    
    // Clean old cache entries
    this.cleanCache();
    
    return visibleInstances;
  }

  isInstanceVisible(instance, viewportBounds) {
    const bounds = instance.renderBounds;
    
    return (
      bounds.x + bounds.width >= viewportBounds.x &&
      bounds.x <= viewportBounds.x + viewportBounds.width &&
      bounds.y + bounds.height >= viewportBounds.y &&
      bounds.y <= viewportBounds.y + viewportBounds.height
    );
  }
}
```

## **IV. Visual Orchestration Subsystem (Renderer Version)**

```javascript
// ====================================================================
// VISUAL ORCHESTRATION SUBSYSTEM (Renderer Version)
// ====================================================================

class VisualOrchestrationSubsystem {
  constructor() {
    this.zLayerManager = new RendererZLayerManager();
    this.productPositioner = new RendererProductPositioner();
    this.hitTester = new HitTester();
  }
}

/**
 * Z-LAYER MANAGER (Renderer Version)
 * Manages drawing order/depth on target canvas
 */
class RendererZLayerManager {
  sortByZIndex(instances) {
    return [...instances].sort((a, b) => {
      // Use pre-calculated z-index from Core Layer
      const zA = a.zLayerProperties?.finalZIndex || 0;
      const zB = b.zLayerProperties?.finalZIndex || 0;
      
      // Lower z-index draws first (back to front)
      return zA - zB;
    });
  }

  /**
   * Apply stacking context rules for special cases
   */
  applyStackingContext(instances, viewport) {
    // Group by shelf level
    const byShelf = this.groupByShelf(instances);
    
    // Apply shelf-specific rules
    return Object.values(byShelf).flatMap(shelfInstances => {
      return this.applyShelfStacking(shelfInstances, viewport);
    });
  }

  groupByShelf(instances) {
    return instances.reduce((groups, instance) => {
      const shelfIndex = instance.semanticCoordinates?.shelfIndex || 0;
      if (!groups[shelfIndex]) groups[shelfIndex] = [];
      groups[shelfIndex].push(instance);
      return groups;
    }, {});
  }
}

/**
 * PRODUCT POSITIONER (Renderer Version)
 * Applies final transform to sprites/meshes
 */
class RendererProductPositioner {
  applyTransforms(context, renderCoordinates) {
    const { x, y, scale = 1, rotation = 0, anchorPoint } = renderCoordinates;
    
    // Save current context state
    context.save();
    
    // Move to position
    context.translate(x, y);
    
    // Apply rotation around anchor point
    if (rotation !== 0) {
      const anchorX = (renderCoordinates.width || 0) * (anchorPoint?.x || 0.5);
      const anchorY = (renderCoordinates.height || 0) * (anchorPoint?.y || 0.5);
      context.translate(anchorX, anchorY);
      context.rotate(rotation * Math.PI / 180);
      context.translate(-anchorX, -anchorY);
    }
    
    // Apply scale
    if (scale !== 1) {
      context.scale(scale, scale);
    }
    
    return context;
  }

  resetTransforms(context) {
    context.restore();
  }
}

/**
 * HIT TESTER (Renderer Version)
 * Interaction detection using prepared instance data
 */
class HitTester {
  test(screenX, screenY, instances, viewport) {
    // Convert screen to world coordinates
    const worldPos = this.screenToWorld(screenX, screenY, viewport);
    
    // Sort front to back for hit testing
    const sortedInstances = [...instances].sort((a, b) => {
      return (b.zLayerProperties?.finalZIndex || 0) - 
             (a.zLayerProperties?.finalZIndex || 0);
    });
    
    // Test each instance
    for (const instance of sortedInstances) {
      if (this.testInstance(worldPos, instance)) {
        return {
          instance,
          hitPoint: worldPos,
          screenPoint: { x: screenX, y: screenY }
        };
      }
    }
    
    return null;
  }

  testInstance(worldPos, instance) {
    const bounds = instance.renderBounds;
    
    // Quick bounding box test
    if (!this.pointInBounds(worldPos, bounds)) {
      return false;
    }
    
    // If instance has alpha mask, perform pixel-perfect test
    if (instance.maskProperties?.required) {
      return this.testAlphaMask(worldPos, instance);
    }
    
    return true;
  }
}
```

## **V. Sprite Execution Subsystem (Renderer Version)**

```javascript
// ====================================================================
// SPRITE EXECUTION SUBSYSTEM (Renderer Version)
// ====================================================================

class SpriteExecutionSubsystem {
  constructor() {
    this.spriteCache = new SpriteCache();
    this.productSprite = new RendererProductSprite(this.spriteCache);
    this.maskRenderer = new RendererMaskRenderer();
    this.shadowRenderer = new RendererShadowRenderer();
  }
}

/**
 * PRODUCT SPRITE (Renderer Version)
 * Renders specific sprite angle using 9-angle logic
 */
class RendererProductSprite {
  constructor(spriteCache) {
    this.spriteCache = spriteCache;
    this.angleSelector = new ParallaxController();
  }

  async render(context, instance, viewport) {
    // 1. Determine which of 9 angles to use
    const angle = this.angleSelector.selectAngle(instance, viewport);
    
    // 2. Load sprite from cache
    const sprite = await this.loadSprite(instance, angle);
    
    // 3. Draw sprite
    context.drawImage(
      sprite.image,
      0, 0,  // Source position
      sprite.width, sprite.height,
      0, 0,  // Destination position (transforms already applied)
      instance.renderCoordinates.width,
      instance.renderCoordinates.height
    );
    
    return { drawCalls: 1, angle };
  }

  async loadSprite(instance, angle) {
    const cacheKey = `${instance.sku}_${angle}`;
    
    if (this.spriteCache.has(cacheKey)) {
      return this.spriteCache.get(cacheKey);
    }
    
    // Load sprite asset
    const spriteUrl = this.getSpriteUrl(instance, angle);
    const image = await this.loadImage(spriteUrl);
    
    const spriteData = {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      angle,
      timestamp: Date.now()
    };
    
    this.spriteCache.set(cacheKey, spriteData);
    return spriteData;
  }

  getSpriteUrl(instance, angle) {
    // Find URL in instance assets
    const variant = instance.assets?.spriteVariants?.find(
      v => v.angle === angle
    );
    
    return variant?.url || instance.sourceData?.assets?.sprites?.baseUrl;
  }
}

/**
 * MASK RENDERER (Renderer Version)
 * Renders masks onto sprites
 */
class RendererMaskRenderer {
  async apply(context, instance, viewport) {
    if (!instance.maskProperties?.required) return;
    
    // Apply mask using compositing
    context.globalCompositeOperation = instance.maskProperties.compositeOperation;
    
    // Draw mask
    const mask = await this.loadMask(instance);
    context.drawImage(
      mask,
      0, 0,
      instance.renderCoordinates.width,
      instance.renderCoordinates.height
    );
    
    // Reset compositing
    context.globalCompositeOperation = 'source-over';
  }
}

/**
 * SHADOW RENDERER (Renderer Version)
 * Renders shadows based on prepared data
 */
class RendererShadowRenderer {
  async render(context, instance, viewport) {
    const shadow = instance.shadowProperties;
    if (!shadow?.enabled) return;
    
    context.save();
    
    // Apply shadow styling
    context.shadowColor = shadow.color;
    context.shadowBlur = shadow.blur;
    context.shadowOffsetX = shadow.offset.x;
    context.shadowOffsetY = shadow.offset.y;
    
    // Draw shadow shape
    this.drawShadowShape(context, instance);
    
    context.restore();
  }

  drawShadowShape(context, instance) {
    const bounds = instance.renderBounds;
    const shadowType = instance.shadowProperties.type;
    
    switch (shadowType) {
      case 'drop':
        this.drawDropShadow(context, bounds);
        break;
      case 'contact':
        this.drawContactShadow(context, bounds, instance);
        break;
      case 'frost':
        this.drawFrostShadow(context, bounds, instance);
        break;
    }
  }
}
```

## **VI. Context-Specific Renderers**

```javascript
// ====================================================================
// CONTEXT SUBSYSTEM
// ====================================================================

/**
 * PUBLISHER RENDERER - 2D with heatmaps
 */
class PublisherRenderer extends RendererLayer {
  constructor() {
    super('canvas2d');
    this.heatmapEngine = new HeatmapEngine();
    this.config = {
      enableHeatmaps: true,
      enableGrid: true,
      printMode: true,
      dpi: 300
    };
  }

  async applyOverlays(context, instances, viewport, editingState) {
    // Apply heatmap overlays
    if (this.config.enableHeatmaps) {
      await this.heatmapEngine.render(context, instances, viewport);
    }
    
    // Apply print grid if enabled
    if (this.config.enableGrid && this.config.printMode) {
      this.renderPrintGrid(context, viewport);
    }
  }
}

/**
 * VISUALIZER RENDERER - 2.5D with parallax
 */
class VisualizerRenderer extends RendererLayer {
  constructor() {
    super('webgl');
    this.parallaxController = new ParallaxController();
    this.config = {
      enableParallax: true,
      enableShadows: true,
      enableRealTimeFeedback: true
    };
  }

  async applyOverlays(context, instances, viewport, editingState) {
    // Apply parallax effect
    if (this.config.enableParallax) {
      this.parallaxController.apply(context, instances, viewport);
    }
    
    // Apply editing feedback
    if (editingState) {
      await this.renderEditingFeedback(context, instances, editingState);
    }
  }
}

/**
 * VSE RENDERER - 3D immersive
 */
class VSERenderer extends RendererLayer {
  constructor() {
    super('threejs');
    this.cameraController = new CameraController();
    this.lightingSystem = new LightingSystem();
    this.config = {
      cameraHeight: 1650, // mm (1.65m eye level)
      enableVR: false,
      enableFirstPerson: true
    };
  }

  async render(processedPlanogram, threeScene, camera, viewport) {
    // Set up 3D camera
    this.cameraController.setup(camera, this.config);
    
    // Convert 2D instances to 3D meshes
    const meshes = await this.convertTo3D(processedPlanogram.renderInstances);
    
    // Add to scene
    meshes.forEach(mesh => threeScene.add(mesh));
    
    // Apply lighting
    this.lightingSystem.setup(threeScene);
    
    // Render
    this.renderer.render(threeScene, camera);
  }

  async convertTo3D(instances) {
    return Promise.all(instances.map(async instance => {
      // Load 3D model or create from 2D sprite
      const mesh = await this.load3DModel(instance.sku);
      
      // Position using render coordinates
      mesh.position.set(
        instance.renderCoordinates.x,
        instance.renderCoordinates.y,
        instance.renderCoordinates.z || 0
      );
      
      // Scale
      mesh.scale.setScalar(instance.renderScale);
      
      return mesh;
    }));
  }
}
```

## **VII. Complete System Integration**

```javascript
/**
 * COMPLETE SYSTEM INTEGRATION
 */
class CompleteSystem {
  constructor() {
    // Layer 1-3 Processing
    this.coreProcessor = new CoreLayerProcessor(
      new FixtureRegistry(),
      new PlacementModelRegistry(),
      new MetadataStore()
    );
    
    // Layer 4 Renderers (context-specific)
    this.renderers = {
      publisher: new PublisherRenderer(),
      visualizer: new VisualizerRenderer(),
      vse: new VSERenderer()
    };
    
    // Performance monitoring
    this.performance = new SystemPerformanceMonitor();
  }

  /**
   * Complete rendering pipeline
   */
  async renderPlanogram(planogramConfig, contextType, outputContext, viewport, editingState) {
    // PHASE A: Core Layer Processing (L1-L3 → Prepared Instances)
    console.time('core-processing');
    const processed = await this.coreProcessor.processPlanogram(planogramConfig);
    console.timeEnd('core-processing');
    
    // PHASE B: Renderer Layer (Prepared Instances → Visual Output)
    console.time('renderer-execution');
    const renderer = this.renderers[contextType];
    const result = await renderer.render(
      processed,
      outputContext,
      viewport,
      editingState
    );
    console.timeEnd('renderer-execution');
    
    // Performance reporting
    this.performance.recordOperation({
      coreProcessingTime: processed.metadata.processingTime,
      renderTime: result.renderTime,
      totalInstances: processed.metadata.totalInstances,
      visibleInstances: result.visibleInstances,
      drawCalls: result.drawCalls
    });
    
    return {
      success: true,
      renderResult: result,
      processedData: processed,
      performance: this.performance.getMetrics()
    };
  }
}
```

## **VIII. Key Architecture Benefits**

### **Separation of Concerns:**
1. **Core Processing**: Stateless data transformation (pure functions)
2. **Renderer Layer**: Platform-specific rendering (side effects)

### **Performance Optimizations:**
1. **Pre-calculated values**: z-index, bounds, scale computed once
2. **Caching**: Sprites, masks, shadows cached at appropriate levels
3. **Lazy evaluation**: Assets loaded only when needed

### **Flexibility:**
1. **Multiple renderers**: Same processed data → different visual outputs
2. **Extensible**: New render engines can be added easily
3. **Maintainable**: Clear boundaries between data prep and rendering

This architecture ensures the Core Layer remains **stateless and pure** while the Renderer Layer handles all **platform-specific rendering concerns**, delivering both performance and flexibility.
