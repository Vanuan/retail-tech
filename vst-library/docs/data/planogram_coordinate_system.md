# Planogram Semantic Coordinate System

## Core Concept: "Retail Truth"

The semantic coordinate system stores **physical reality** in millimeters, not screen pixels. This is the foundational principle that enables portability across different visualization contexts.

## Coordinate Definitions

### X-Coordinate (Horizontal Position)
```
Value: Numeric (mm)
Anchor: Fixture left edge
Range: 0 to shelf.width
Purpose: Absolute horizontal placement
```

**Key Properties:**
- **Continuous measurement**: Not limited to slot boundaries
- **Physical distance**: Real-world millimeters from left edge
- **Starting point**: Where the product's left edge begins
- **Occupied space**: `x + (productWidth × horizontalFacings)` = total footprint

### Shelf/Level Index (Vertical Position)
```
Value: Integer
Anchor: Bottom-up indexing (0 = bottom shelf)
Purpose: Vertical level identification
```

### Depth (Front-to-Back Position)
```
Value: Integer (typically 0 or 1)
Range: 0 = front row, 1+ = back rows
Purpose: Row positioning with perspective scaling
Visual effect: Back rows rendered at 92% scale
```

### Facings (Occupancy Footprint)
```
Horizontal facings: Product repetition left-to-right
Vertical facings: Product repetition bottom-to-top
Purpose: Defines 2D rectangular occupancy area
```

## Slots vs. Semantic Coordinates

### Slots: The Structural Framework
```javascript
{
  slots: 12,           // Number of logical divisions
  slotWidth: 70,       // Width of each slot in mm
  totalWidth: 840      // 12 × 70mm
}
```

**Slots serve as:**
- Logical markers for fixture structure
- Magnetic snap points in the editor
- Alignment guides for merchandisers
- **NOT** the storage format for product position

### The Translation Process
```javascript
// Semantic coordinate (stored)
const semanticX = 210; // mm from left edge

// Slot calculation (for alignment/snapping)
const slotIndex = Math.round(semanticX / slotWidth); // slot 3

// Render coordinate (runtime transformation)
const renderX = (fixtureLeftEdge + semanticX) * zoomLevel;
```

## Coordinate Transformation Pipeline

```
[Semantic Layer]          [Core Layer]           [Render Layer]
     (mm)          →    (calculation)      →       (pixels)
                                                      ↓
  x: 210mm              ProductPositioner        x: 420px @ 2x zoom
  shelf: 2         →    + slot alignment    →    y: 480px
  depth: 0              + zoom scaling           z-index: 10
  facings: 2            + depth scaling          scale: 1.0
```

## Collision Detection & Validation

### Bounding Box Calculation
```javascript
// Product occupancy in semantic space
const boundingBox = {
  x: product.x,
  y: shelf.y,
  width: product.physicalWidth × product.horizontalFacings,
  height: product.physicalHeight × product.verticalFacings
};

// Validation rules
const isValid = 
  (x + width) <= shelf.width &&           // Doesn't exceed shelf
  !overlapsOtherProducts(boundingBox);    // No collisions
```

### ShelfSurfaceModel Validation
The system validates placement in **semantic space** before rendering:
- X bounds check: `0 ≤ x ≤ shelf.width`
- Occupancy check: `x + (width × facings) ≤ shelf.width`
- Collision check: No overlap with existing product bounding boxes

## Model-Specific Behaviors

### Shelf Surface Model
```
Reasoning: Tape measure approach
X-axis: Continuous millimeter measurement
Placement: Can be positioned at any mm value
Snapping: Uses slots for magnetic alignment (editor only)
```

### Pegboard Grid Model
```
Reasoning: Grid coordinate approach
Coordinates: (pegRow, pegCol) on 25.4mm (1-inch) grid
Placement: Discrete positions only
Calculation: Physical position = col × 25.4mm, row × 25.4mm
```

## Context-Specific Transformations

### 1. Fixture Visualizer (Editor)
```javascript
// Semantic → Visual with snap guides
{
  semanticX: 210,           // Stored value
  slotAlignment: 3,         // Nearest slot for snapping
  renderX: calculatePixels(210, zoom),
  showCollisions: true,     // Red boxes for overlaps
  magneticSnap: enabled     // Snap to slot boundaries
}
```

### 2. Publisher (Analytics)
```javascript
// Semantic → Heatmap overlay
{
  semanticX: 210,
  renderX: calculatePixels(210, zoom),
  heatmapColor: interpolate(salesData), // Green to red
  showSlots: false          // Slots irrelevant for analytics
}
```

### 3. Virtual Store Experience (3D)
```javascript
// Semantic → 3D world coordinates
{
  semanticX: 210,           // mm from fixture left
  semanticShelf: 2,         // Level index
  world3D: {
    x: fixtureWorldX + 0.21, // meters in world space
    y: 1.65 + (shelfHeight × 2), // Eye level + shelf offset
    z: fixtureWorldZ + (depth × 0.3) // Front/back row
  }
}
```

## Key Reasoning Principles

1. **Semantic coordinates are the source of truth** - Always stored in mm
2. **Slots are helper structures** - Used for alignment, not storage
3. **Transformation happens at runtime** - Different contexts need different pixels
4. **Bounding boxes use semantic space** - Collision detection before rendering
5. **Context determines visualization** - Same data, multiple presentations

## State Management Flow

```
User Action (Drag product)
    ↓
Calculate Semantic Position (mm from fixture left)
    ↓
Validate Against Fixture Constraints
    ↓
Check Collisions in Semantic Space
    ↓
Store Semantic Coordinates
    ↓
Transform to Render Coordinates
    ↓
Apply Visual Effects (zoom, depth scaling)
    ↓
Display on Screen
```

This architecture ensures that planogram data remains **portable, validatable, and context-agnostic** while supporting rich visual experiences across different use cases.
