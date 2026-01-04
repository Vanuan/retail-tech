# Extending the VST Vocabulary

This package defines the "shared language" of the VST ecosystem. Because it is used across the backend, frontend, and rendering engines, extensions must be made intentionally to maintain a clean separation between **what** things are and **how** they behave.

## Design Principles

1.  **Nouns only**: Only add types that describe data shapes or domain concepts.
2.  **No Logic**: Do not add functions, classes with methods, or validation logic.
3.  **Open Protocols**: Favor extensible interfaces over closed unions.

---

## Adding a new SemanticPosition

To add a new way to position items (e.g., `PegboardGridPosition`), follow these steps:

1.  **Implement the base**: Create a new interface that extends `SemanticPositionBase`.
2.  **Unique Model**: Provide a unique string literal for the `model` property.
3.  **Data Only**: Ensure all properties are readonly primitives or other vocabulary types.

```ts
export interface PegboardGridPosition extends SemanticPositionBase {
  readonly model: 'pegboard-grid';
  readonly holeX: number;
  readonly holeY: number;
}
```

*Note: Do not modify the `SemanticPosition` type alias if it is defined as `SemanticPositionBase`. The system uses type narrowing based on the `model` property.*

---

## Adding a new RenderInstance property

When adding visual properties to the rendering contract:

-   **Must be optional**: New properties must not break existing renderers that don't support them yet.
-   **Stable Units**: Use branded units (like `Millimeters` or `Pixels`) from `core/units.ts`.

---

## Adding new Metadata or Intents

-   Define new interfaces in the appropriate domain folder (e.g., `planogram/metadata.ts`).
-   Avoid editing existing shared unions unless the change is a fundamental shift in the domain model.