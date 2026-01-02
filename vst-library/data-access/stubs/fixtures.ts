import { FixtureConfig } from "../../types";

/**
 * STUB_FIXTURES
 * Centralized mock database for fixture configurations.
 * Extracted from early repository implementations and prototypes.
 */
export const STUB_FIXTURES: FixtureConfig[] = [
  {
    type: "standard-gondola-shelf",
    placementModel: "shelf-linear",
    dimensions: {
      width: 1200, // mm
      height: 1800, // mm
      depth: 450, // mm
    },
    config: {
      shelfCount: 5,
      maxShelves: 8,
      snappingInterval: 10, // mm
      allowOverhang: false,
    },
    background: {
      color: "#E5E7EB", // Light Gray
    },
  },
  {
    type: "pegboard-display",
    placementModel: "hole-grid",
    dimensions: {
      width: 900,
      height: 1500,
      depth: 50,
    },
    config: {
      holeSpacingX: 25.4, // 1 inch
      holeSpacingY: 25.4,
      maxWeightCapacity: 50, // kg
    },
    background: {
      color: "#F3F4F6",
      imageUrl: "/assets/fixtures/pegboard_pattern.png",
    },
  },
  {
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
      doorType: "glass-sliding",
      hasInternalLighting: true,
    },
    background: {
      color: "#f8fafc",
      imageUrl: "/assets/fixtures/cooler_back.png",
    },
  },
  {
    type: "floor-stack",
    placementModel: "free-form",
    dimensions: {
      width: 1000,
      height: 1200,
      depth: 1000,
    },
    config: {
      maxStackHeight: 1500,
      basePadding: 50,
    },
    background: {
      color: "#d1d5db",
    },
  },
];
