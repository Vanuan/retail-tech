# @vst/vocabulary-types

> The "Constitution" of the VST ecosystem.

This package defines the **shared language** of Virtual Store Technology. It contains the nouns, shapes, and invariants that allow the backend, worker threads, rendering engine, and UI to communicate with absolute precision.

## Design Philosophy

This package is governed by a strict "Non-Behavioral" contract:

-   ✅ **Nouns Only**: Contains interfaces, type aliases, and enums.
-   ✅ **Universal Safety**: Safe to import in any environment (Node.js, Browser, Worker).
-   ✅ **Zero Runtime Dependencies**: No business logic, no side effects, no heavy dependencies.
-   ❌ **No Helpers**: No factories, validators, or transformation functions.
-   ❌ **No Orchestration**: No registries, managers, or lifecycle logic.

If a file answers **"how"**, it does not belong here.  
If it answers **"what"**, it probably does.

---

## Package Structure

-   `core/`: Pure, domain-agnostic primitives (Units, Geometry, Dimensions).
-   `coordinates/`: Semantic and Render-space positioning protocols.
-   `planogram/`: High-level business vocabulary (Products, Fixtures, Configurations).
-   `rendering/`: The contract consumed by drawing engines (RenderInstances, Visual Properties).
-   `repositories/`: Data access interfaces and provider contracts.
-   `validation/`: Standard shapes for reporting errors and warnings.

---

## Extension Policy

This vocabulary is designed to grow organically through **Open Protocols**. 

We favor extensible base interfaces (like `SemanticPositionBase`) over closed unions. This allows new placement models or rendering properties to be introduced without requiring modifications to the core vocabulary files.

See [EXTENDING.md](./EXTENDING.md) for the formal extension contract.

---

## Litmus Test

A type belongs in `@vst/vocabulary-types` **if and only if**:

1.  It must be shared by at least two disparate layers (e.g., API and Renderer).
2.  It has no runtime implementation requirements.
3.  It would still make sense even if no implementation code existed yet.

---

## Usage

```ts
import { ShelfSurfacePosition, Millimeters } from '@vst/vocabulary-types';

const pos: ShelfSurfacePosition = {
  model: 'shelf-surface',
  x: 150 as Millimeters,
  shelfIndex: 2,
  depth: 0
};
```
