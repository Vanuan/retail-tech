import { PlanogramConfig } from "../../types";

/**
 * STUB_PLANOGRAMS
 * Centralized mock database for planogram configurations.
 * Extracted from early prototypes and demonstration data.
 */
export const STUB_PLANOGRAMS: Record<string, PlanogramConfig> = {
  "beverage-cooler-demo": {
    fixture: {
      type: "cooler",
      placementModel: "grid",
      dimensions: {
        width: 1200,
        height: 2000,
        depth: 600,
      },
      config: {
        shelves: 6,
        temperature: "cold",
      },
      background: {
        color: "#f8fafc",
      },
    },
    products: [
      {
        id: "p1",
        sku: "COK-001",
        placement: {
          coordinates: { x: 0, shelfIndex: 0 },
          facings: { horizontal: 3, vertical: 2 },
        },
      },
      {
        id: "p2",
        sku: "SPR-001",
        placement: {
          coordinates: { x: 400, shelfIndex: 0 },
          facings: { horizontal: 2, vertical: 2 },
        },
      },
      {
        id: "p3",
        sku: "WAT-001",
        placement: {
          coordinates: { x: 800, shelfIndex: 0 },
          facings: { horizontal: 3, vertical: 2 },
        },
      },
      {
        id: "p4",
        sku: "ENR-001",
        placement: {
          coordinates: { x: 0, shelfIndex: 2 },
          facings: { horizontal: 2, vertical: 2 },
          pyramid: {
            layers: 2,
            baseFacings: { horizontal: 2, vertical: 2 },
            horizontalDecrement: 1,
            verticalIncrement: 0,
            alignment: "center",
          },
        },
      },
      {
        id: "p5",
        sku: "JUC-001",
        placement: {
          coordinates: { x: 300, shelfIndex: 2 },
          facings: { horizontal: 2, vertical: 2 },
        },
      },
      {
        id: "p6",
        sku: "SMO-001",
        placement: {
          coordinates: { x: 600, shelfIndex: 4 },
          facings: { horizontal: 2, vertical: 2 },
          pyramid: {
            layers: 2,
            baseFacings: { horizontal: 2, vertical: 2 },
            horizontalDecrement: 1,
            verticalIncrement: 0,
            alignment: "center",
          },
        },
      },
      {
        id: "p7",
        sku: "JUC-002",
        placement: {
          coordinates: { x: 0, shelfIndex: 3 },
          facings: { horizontal: 2, vertical: 2 },
        },
      },
      {
        id: "p8",
        sku: "TEA-001",
        placement: {
          coordinates: { x: 300, shelfIndex: 3 },
          facings: { horizontal: 3, vertical: 2 },
        },
      },
      {
        id: "p9",
        sku: "MLK-001",
        placement: {
          coordinates: { x: 750, shelfIndex: 3 },
          facings: { horizontal: 3, vertical: 2 },
        },
      },
      {
        id: "p10",
        sku: "SPW-001",
        placement: {
          coordinates: { x: 0, shelfIndex: 5 },
          facings: { horizontal: 4, vertical: 2 },
        },
      },
      {
        id: "p11",
        sku: "COM-001",
        placement: {
          coordinates: { x: 500, shelfIndex: 5 },
          facings: { horizontal: 3, vertical: 2 },
        },
      },
      {
        id: "p12",
        sku: "LEM-001",
        placement: {
          coordinates: { x: 850, shelfIndex: 5 },
          facings: { horizontal: 3, vertical: 2 },
        },
      },
    ],
  },

  "basic-shelf-demo": {
    fixture: {
      type: "standard-gondola-shelf",
      placementModel: "shelf-linear",
      dimensions: {
        width: 1200,
        height: 1800,
        depth: 450,
      },
      config: {
        shelfCount: 5,
      },
    },
    products: [
      {
        id: "b1",
        sku: "SKU123",
        placement: {
          coordinates: { x: 100, shelfIndex: 1 },
          facings: { horizontal: 4, vertical: 1 },
        },
      },
      {
        id: "b2",
        sku: "SKU789",
        placement: {
          coordinates: { x: 500, shelfIndex: 1 },
          facings: { horizontal: 2, vertical: 1 },
        },
      },
    ],
  },
};
