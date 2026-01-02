import {
  ProductMetadata,
  FixtureConfig,
  Millimeters,
  ShelfIndex,
  PlanogramConfig,
  SourceProduct,
  createFacingConfig,
} from "../types";

export const PRODUCT_CATALOG: Record<string, ProductMetadata> = {
  "COKE-001": {
    id: "meta-coke",
    sku: "COKE-001",
    name: "Coca-Cola Classic 12oz",
    classification: { category: "Beverage", brand: "Coca-Cola" },
    dimensions: {
      physical: {
        width: 63 as Millimeters,
        height: 122 as Millimeters,
        depth: 63 as Millimeters,
      },
      visual: { width: 63, height: 122, anchor: { x: 0.5, y: 1 } },
    },
    visualProperties: {
      spriteVariants: [{ angle: 0, url: "/coca-cola-can.png" }],
      shadowType: "standard",
    },
    pricing: { unitPrice: 1.5 },
  },
  "PEPSI-001": {
    id: "meta-pepsi",
    sku: "PEPSI-001",
    name: "Pepsi Cola 12oz",
    classification: { category: "Beverage", brand: "Pepsi" },
    dimensions: {
      physical: {
        width: 63 as Millimeters,
        height: 122 as Millimeters,
        depth: 63 as Millimeters,
      },
      visual: { width: 63, height: 122, anchor: { x: 0.5, y: 1 } },
    },
    visualProperties: {
      spriteVariants: [{ angle: 0, url: "/pepsi-can.png" }],
      shadowType: "standard",
    },
    pricing: { unitPrice: 1.45 },
  },
  "SPRITE-001": {
    id: "meta-sprite",
    sku: "SPRITE-001",
    name: "Sprite 12oz",
    classification: { category: "Beverage", brand: "Sprite" },
    dimensions: {
      physical: {
        width: 63 as Millimeters,
        height: 122 as Millimeters,
        depth: 63 as Millimeters,
      },
      visual: { width: 63, height: 122, anchor: { x: 0.5, y: 1 } },
    },
    visualProperties: {
      spriteVariants: [{ angle: 0, url: "/sprite-can.png" }],
      shadowType: "standard",
    },
    pricing: { unitPrice: 1.35 },
  },
  "WATER-001": {
    id: "meta-water",
    sku: "WATER-001",
    name: "Spring Water 16oz",
    classification: { category: "Beverage" },
    dimensions: {
      physical: {
        width: 64 as Millimeters,
        height: 203 as Millimeters,
        depth: 64 as Millimeters,
      },
      visual: { width: 64, height: 203, anchor: { x: 0.5, y: 1 } },
    },
    visualProperties: {
      spriteVariants: [{ angle: 0, url: "/water-bottle.png" }],
      shadowType: "standard",
    },
    pricing: { unitPrice: 1.0 },
  },
  "CHIPS-001": {
    id: "meta-chips-1",
    sku: "CHIPS-001",
    name: "Potato Chips Original",
    classification: { category: "Snack" },
    dimensions: {
      physical: {
        width: 150 as Millimeters,
        height: 200 as Millimeters,
        depth: 60 as Millimeters,
      },
      visual: { width: 150, height: 200, anchor: { x: 0.5, y: 1 } },
    },
    visualProperties: {
      spriteVariants: [{ angle: 0, url: "/chips-bag.png" }],
      shadowType: "drop",
    },
    pricing: { unitPrice: 2.2 },
  },
  "CHIPS-002": {
    id: "meta-chips-2",
    sku: "CHIPS-002",
    name: "Potato Chips Flavour",
    classification: { category: "Snack" },
    dimensions: {
      physical: {
        width: 150 as Millimeters,
        height: 200 as Millimeters,
        depth: 60 as Millimeters,
      },
      visual: { width: 150, height: 200, anchor: { x: 0.5, y: 1 } },
    },
    visualProperties: {
      spriteVariants: [{ angle: 0, url: "/chips-bag.png" }],
      shadowType: "drop",
    },
    pricing: { unitPrice: 2.2 },
  },
};

export const DEFAULT_FIXTURE: FixtureConfig = {
  type: "shelf",
  placementModel: "shelf-surface",
  dimensions: {
    width: 1200 as Millimeters,
    height: 1800 as Millimeters,
    depth: 400 as Millimeters,
  },
  config: {
    shelves: [
      { id: "shelf-0", index: 0, baseHeight: 0 },
      { id: "shelf-1", index: 1, baseHeight: 450 },
      { id: "shelf-2", index: 2, baseHeight: 900 },
      { id: "shelf-3", index: 3, baseHeight: 1350 },
    ],
    depthSpacing: 300,
  },
  visualProperties: {
    assets: {
      upright: "/fixture-upright.png",
      shelfSurface: "/fixture-shelf2.png",
      priceRail: "/fixture-priceholder.png",
      base: "/fixture-base.png",
      back: "/fixture-back.jpg",
    },
    dimensions: {
      uprightWidth: 45 as Millimeters,
      baseHeight: 100 as Millimeters,
      shelfSurfaceHeight: 40 as Millimeters,
      priceRailHeight: 35 as Millimeters,
      priceLabelHeight: 28 as Millimeters,
      headerHeight: 120 as Millimeters,
    },
  },
  background: {
    color: "#f3f4f6",
  },
};

export const MOCK_PRODUCTS: SourceProduct[] = [
  {
    id: "inst-1",
    sku: "COKE-001",
    placement: {
      position: {
        model: "shelf-surface",
        x: 50 as Millimeters,
        shelfIndex: 0 as ShelfIndex,
        depth: 0,
      },
      facings: createFacingConfig(3, 1),
    },
    pricing: { unitPrice: 1.5 },
  },
  {
    id: "inst-2",
    sku: "PEPSI-001",
    placement: {
      position: {
        model: "shelf-surface",
        x: 250 as Millimeters,
        shelfIndex: 0 as ShelfIndex,
        depth: 0,
      },
      facings: createFacingConfig(2, 1),
    },
    pricing: { unitPrice: 1.45 },
  },
  {
    id: "inst-3",
    sku: "WATER-001",
    placement: {
      position: {
        model: "shelf-surface",
        x: 50 as Millimeters,
        shelfIndex: 1 as ShelfIndex,
        depth: 0,
      },
      facings: createFacingConfig(4, 1),
    },
    pricing: { unitPrice: 1.0 },
  },
  {
    id: "inst-4",
    sku: "CHIPS-001",
    placement: {
      position: {
        model: "shelf-surface",
        x: 50 as Millimeters,
        shelfIndex: 2 as ShelfIndex,
        depth: 0,
      },
      facings: createFacingConfig(2, 1),
    },
    pricing: { unitPrice: 2.2 },
  },
];

export const MOCK_PLANOGRAM: PlanogramConfig = {
  id: "mock-1",
  name: "Mock Planogram",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  thumbnail: "",
  fixture: DEFAULT_FIXTURE,
  products: MOCK_PRODUCTS,
};
