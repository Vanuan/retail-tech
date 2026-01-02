# Rendering System

The VST Rendering System transforms logical planogram data into visual representations. It is designed to be platform-agnostic, supporting multiple rendering contexts (Canvas 2D, WebGL/Babylon.js) through a unified interface.

## Core Concepts

### 1. Viewport Controller (`ViewportController.ts`)
Manages the "camera" of the 2D/3D view. It handles:
- **Pan & Zoom**: Standard interactions for navigating large planograms.
- **Coordinate Conversion**: Mapping between Screen Space (pixels) and World Space (millimeters).
- **Culling**: Identifying which products are currently visible to optimize performance.

### 2. Render Engine Interface (`IVstRenderer`)
All renderers implement this contract, ensuring the UI layer doesn't need to know about the underlying technology.

```typescript
interface IVstRenderer {
  render(
    instances: RenderInstance[],
    fixture: FixtureConfig,
    projection: RenderProjection
  ): void;
  
  initialize(el: HTMLElement, config: RenderEngineConfig): void;
  // ...
}
```

### 3. Implementations

The library comes with three built-in renderers:

- **Canvas2DRenderer**: High-performance, lightweight renderer using the standard HTML5 Canvas API. Ideal for low-end devices or simple 2D editing.
- **BabylonRenderer**: High-fidelity 3D renderer using Babylon.js. Supports advanced lighting, shadows, and perspective cameras.
- **TescoRenderer**: A specialized 2D renderer showcasing how to implement custom branding and specific visual requirements (e.g., "Taste the Difference" styling).

## Utilities

### Projection (`Projection.ts`)
A stateless mathematical utility for converting coordinates.
- `project(worldPoint)`: World (mm) → Screen (px)
- `unproject(screenPoint)`: Screen (px) → World (mm)

### LabelUtils
Shared logic for drawing price labels, ensuring consistency across different renderers.

## Usage

```typescript
import { Canvas2DRenderer } from '@vst/renderer/implementations/Canvas2DRenderer';
import { ViewportController } from '@vst/renderer/ViewportController';

// 1. Setup
const renderer = new Canvas2DRenderer(assetProvider);
renderer.initialize(containerElement, { width: 800, height: 600, dpi: 2 });

const viewport = new ViewportController(800, 600, 2);

// 2. Render Loop
function frame() {
  const visibleInstances = viewport.getVisibleInstances(allInstances, fixture);
  
  renderer.render(
    visibleInstances,
    fixture,
    viewport.getProjection()
  );
  
  requestAnimationFrame(frame);
}
```
