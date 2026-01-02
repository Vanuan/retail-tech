Core layer (foundation of renderer layer) - stateless Z-sorted rendering abstract foundation

- Render Engine - high-level orchestrator - manages the implementation context and platform-specific coordinates (pixel-values). The translation layer from abstract planogram to concrete render primitives. Includes hooks for post-processing plugins, such as overlaying heat maps and metadata.

- Planogram Renderer - entry point of rendering complete planograms consisting of fixtures, products and metadata.

- Products srpite - loading product textures from distinct viewing angles, handling parallax effect.

- Price display - handling context aware display of pricing information.


Layers:

1: Planogram Data (JSON/API/database semantic model of planogram)
2: Atlas (texture pack, performance optimization or rendering multiple small images at once)
3: Facings & Pyramids (handling 2D or pyramid stacking of products)
4: Core layer (renderer interpreting data output from previous layers to draw 2D sprites or 3D meshes)
5: Retail Physics Engine (handle placement of objects, collision detection) implements specialization of Core layer for editing workflows

Application (product) layers:

- Fixture Visualizer - planogram editor use case
- Planogram Publisher - viewing planogram statistics, distribution planogram for execution by field operators
- Virtual store experienge - planogram testing with shopper panel
