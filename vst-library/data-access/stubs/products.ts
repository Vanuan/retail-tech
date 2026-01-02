import { ProductMetadata } from "../../types";

/**
 * STUB_PRODUCTS
 * Centralized mock database for product metadata.
 * Extracted from prototypes and early repository implementations.
 */
export const STUB_PRODUCTS: ProductMetadata[] = [
  // --- Original Repository Defaults ---
  {
    id: "SKU123",
    sku: "SKU123",
    name: "Premium Cola",
    classification: { category: "beverages", subCategory: "soda" },
    dimensions: {
      physical: { width: 60, height: 120, depth: 60 },
      visual: { width: 50, height: 100, anchor: { x: 0.5, y: 1.0 } },
    },
    visualProperties: {
      spriteVariants: [],
      maskUrl: null,
      hasTransparency: false,
      shadowType: "standard",
    },
    pricing: { unitPrice: 1.99 },
  },
  {
    id: "SKU456",
    sku: "SKU456",
    name: "Organic Apples",
    classification: { category: "groceries", subCategory: "fresh-produce" },
    dimensions: {
      physical: { width: 80, height: 80, depth: 80 },
      visual: { width: 70, height: 70, anchor: { x: 0.5, y: 1.0 } },
    },
    visualProperties: {
      spriteVariants: [],
      maskUrl: null,
      hasTransparency: true,
      shadowType: "standard",
    },
    pricing: { unitPrice: 0.5 },
  },
  {
    id: "SKU789",
    sku: "SKU789",
    name: "Cereal Box",
    classification: { category: "pantry", subCategory: "breakfast" },
    dimensions: {
      physical: { width: 120, height: 180, depth: 50 },
      visual: { width: 100, height: 150, anchor: { x: 0.5, y: 1.0 } },
    },
    visualProperties: {
      spriteVariants: [],
      maskUrl: null,
      hasTransparency: false,
      shadowType: "standard",
    },
    pricing: { unitPrice: 3.49 },
  },

  // --- Demo Planogram Beverages (COK, SPR, FAN, etc.) ---
  {
    id: "COK-001",
    sku: "COK-001",
    name: "Cola Classic",
    classification: { category: "beverages", subCategory: "soda" },
    dimensions: {
      physical: { width: 65, height: 122, depth: 65 },
      visual: { width: 60, height: 120, anchor: { x: 0.5, y: 1.0 } },
    },
    visualProperties: {
      spriteVariants: [],
      maskUrl: null,
      hasTransparency: false,
      shadowType: "standard",
    },
    pricing: { unitPrice: 1.5 },
  },
  {
    id: "SPR-001",
    sku: "SPR-001",
    name: "Sprite",
    classification: { category: "beverages", subCategory: "soda" },
    dimensions: {
      physical: { width: 65, height: 122, depth: 65 },
      visual: { width: 60, height: 120, anchor: { x: 0.5, y: 1.0 } },
    },
    visualProperties: {
      spriteVariants: [],
      maskUrl: null,
      hasTransparency: true,
      shadowType: "frost",
    },
    pricing: { unitPrice: 1.5 },
  },
  {
    id: "WAT-001",
    sku: "WAT-001",
    name: "Pure Water",
    classification: { category: "beverages", subCategory: "water" },
    dimensions: {
      physical: { width: 70, height: 200, depth: 70 },
      visual: { width: 65, height: 195, anchor: { x: 0.5, y: 1.0 } },
    },
    visualProperties: {
      spriteVariants: [],
      maskUrl: null,
      hasTransparency: true,
      shadowType: "contact",
    },
    pricing: { unitPrice: 1.0 },
  },
  {
    id: "ENR-001",
    sku: "ENR-001",
    name: "Energy Boost",
    classification: { category: "beverages", subCategory: "energy" },
    dimensions: {
      physical: { width: 55, height: 150, depth: 55 },
      visual: { width: 50, height: 145, anchor: { x: 0.5, y: 1.0 } },
    },
    visualProperties: {
      spriteVariants: [],
      maskUrl: null,
      hasTransparency: false,
      shadowType: "drop",
    },
    pricing: { unitPrice: 2.5 },
  },
  {
    id: "JUC-001",
    sku: "JUC-001",
    name: "Orange Juice",
    classification: { category: "beverages", subCategory: "juice" },
    dimensions: {
      physical: { width: 80, height: 180, depth: 80 },
      visual: { width: 75, height: 175, anchor: { x: 0.5, y: 1.0 } },
    },
    visualProperties: {
      spriteVariants: [],
      maskUrl: null,
      hasTransparency: false,
      shadowType: "standard",
    },
    pricing: { unitPrice: 2.99 },
  },
  {
    id: "SMO-001",
    sku: "SMO-001",
    name: "Berry Smoothie",
    classification: { category: "beverages", subCategory: "smoothie" },
    dimensions: {
      physical: { width: 75, height: 160, depth: 75 },
      visual: { width: 70, height: 155, anchor: { x: 0.5, y: 1.0 } },
    },
    visualProperties: {
      spriteVariants: [],
      maskUrl: null,
      hasTransparency: false,
      shadowType: "contact",
    },
    pricing: { unitPrice: 3.99 },
  },
  {
    id: "COK-002",
    sku: "COK-002",
    name: "Cola Zero",
    classification: { category: "beverages", subCategory: "soda" },
    dimensions: {
      physical: { width: 65, height: 122, depth: 65 },
      visual: { width: 60, height: 120, anchor: { x: 0.5, y: 1.0 } },
    },
    visualProperties: {
      spriteVariants: [],
      maskUrl: null,
      hasTransparency: false,
      shadowType: "standard",
    },
    pricing: { unitPrice: 1.5 },
  },
  {
    id: "FAN-001",
    sku: "FAN-001",
    name: "Fanta Orange",
    classification: { category: "beverages", subCategory: "soda" },
    dimensions: {
      physical: { width: 65, height: 122, depth: 65 },
      visual: { width: 60, height: 120, anchor: { x: 0.5, y: 1.0 } },
    },
    visualProperties: {
      spriteVariants: [],
      maskUrl: null,
      hasTransparency: false,
      shadowType: "standard",
    },
    pricing: { unitPrice: 1.5 },
  },
  {
    id: "JUC-002",
    sku: "JUC-002",
    name: "Apple Juice",
    classification: { category: "beverages", subCategory: "juice" },
    dimensions: {
      physical: { width: 80, height: 180, depth: 80 },
      visual: { width: 75, height: 175, anchor: { x: 0.5, y: 1.0 } },
    },
    visualProperties: {
      spriteVariants: [],
      maskUrl: null,
      hasTransparency: false,
      shadowType: "standard",
    },
    pricing: { unitPrice: 2.99 },
  },
  {
    id: "TEA-001",
    sku: "TEA-001",
    name: "Iced Tea",
    classification: { category: "beverages", subCategory: "tea" },
    dimensions: {
      physical: { width: 70, height: 190, depth: 70 },
      visual: { width: 65, height: 185, anchor: { x: 0.5, y: 1.0 } },
    },
    visualProperties: {
      spriteVariants: [],
      maskUrl: null,
      hasTransparency: true,
      shadowType: "standard",
    },
    pricing: { unitPrice: 2.25 },
  },
  {
    id: "MLK-001",
    sku: "MLK-001",
    name: "Chocolate Milk",
    classification: { category: "beverages", subCategory: "dairy" },
    dimensions: {
      physical: { width: 60, height: 150, depth: 60 },
      visual: { width: 55, height: 145, anchor: { x: 0.5, y: 1.0 } },
    },
    visualProperties: {
      spriteVariants: [],
      maskUrl: null,
      hasTransparency: false,
      shadowType: "standard",
    },
    pricing: { unitPrice: 1.89 },
  },
  {
    id: "SPW-001",
    sku: "SPW-001",
    name: "Sports Water",
    classification: { category: "beverages", subCategory: "water" },
    dimensions: {
      physical: { width: 75, height: 210, depth: 75 },
      visual: { width: 70, height: 205, anchor: { x: 0.5, y: 1.0 } },
    },
    visualProperties: {
      spriteVariants: [],
      maskUrl: null,
      hasTransparency: true,
      shadowType: "contact",
    },
    pricing: { unitPrice: 1.75 },
  },
  {
    id: "COM-001",
    sku: "COM-001",
    name: "Coconut Water",
    classification: { category: "beverages", subCategory: "water" },
    dimensions: {
      physical: { width: 65, height: 160, depth: 65 },
      visual: { width: 60, height: 155, anchor: { x: 0.5, y: 1.0 } },
    },
    visualProperties: {
      spriteVariants: [],
      maskUrl: null,
      hasTransparency: false,
      shadowType: "standard",
    },
    pricing: { unitPrice: 2.5 },
  },
  {
    id: "LEM-001",
    sku: "LEM-001",
    name: "Lemonade",
    classification: { category: "beverages", subCategory: "juice" },
    dimensions: {
      physical: { width: 70, height: 180, depth: 70 },
      visual: { width: 65, height: 175, anchor: { x: 0.5, y: 1.0 } },
    },
    visualProperties: {
      spriteVariants: [],
      maskUrl: null,
      hasTransparency: true,
      shadowType: "frost",
    },
    pricing: { unitPrice: 1.99 },
  },
];
