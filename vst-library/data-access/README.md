# Data Access Layer

The Data Access Layer (DAL) provides a unified interface for retrieving and persisting all data required by the VST library. It abstracts away the underlying storage mechanisms (REST APIs, LocalStorage, IndexedDB, etc.), allowing the Core Processor and Renderer to remain pure and storage-agnostic.

## Architecture

The layer is organized around the **Repository Pattern** and accessed via a central **Facade**.

```typescript
import { dal } from '@vst/data-access';

// Unified access point
await dal.initialize();
const product = await dal.products.getBySku('COKE-001');
```

## Key Components

### 1. Unified Facade (`DataAccessLayer`)
Acts as the single entry point. It orchestrates initialization and dependency injection between repositories.

### 2. Repositories
Typed interfaces for domain entity management:
- **ProductRepository**: Metadata, dimensions, and classification.
- **FixtureRepository**: Definitions of shelving units and display equipment.
- **PlanogramRepository**: Saving and loading full planogram configurations.

### 3. Asset Provider
Resolves abstract asset references (e.g., SKU + Angle) into concrete URLs.
- **BrowserAssetProvider**: A client-side implementation that handles caching, image preloading, and URL resolution. It includes a simple in-memory registry for development.

### 4. Placement Models
Registers strategies for translating semantic coordinates into 3D space.
- **PlacementModelRegistry**: Looks up the correct strategy (e.g., `shelf-surface`) for a given fixture.

## Implementations

This library includes "Batteries Included" implementations suitable for prototypes and frontend-only applications:

- **Mock Data**: Pre-seeded with a catalog of beverages and snacks (`mock-data.ts`).
- **LocalStorage**: Planograms are persisted to the browser's LocalStorage (`storage.ts`).
- **In-Memory Cache**: Products and fixtures are served from memory for zero-latency access.

## Usage

### Initialization
Before using the library, initialize the DAL to preload data and warm up caches.

```typescript
import { dal } from '@vst/data-access';

async function bootstrap() {
  await dal.initialize();
  console.log("VST System Ready");
}
```

### Retrieving Data
```typescript
const planograms = await dal.planograms.listAll();
const fixture = await dal.fixtures.getByType('standard-shelf');
```

### Extending
To connect to a real backend, implement the `IDataAccessLayer` interface or individual repositories (like `IProductRepository`) and inject them into the system.