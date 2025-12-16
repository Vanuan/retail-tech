// Base Product interface
export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  brand: string;
  rating: number;
  stock: number;
  position: { row: number; column: number };
  metadata?: Record<string, any>;
}

// Test Configuration interface
export interface TestConfig {
  id: string;
  name: string;
  description: string;
  products: Product[];
  shelfLayout: {
    rows: number;
    columns: number;
    spacing: number;
    orientation: 'grid' | 'flex';
  };
  metrics: string[];
  createdAt: Date;
  status: 'draft' | 'active' | 'completed';
}

// User Behavior tracking
export interface UserBehavior {
  userId: string;
  sessionId: string;
  interactions: InteractionEvent[];
  startTime: Date;
  endTime: Date;
  deviceInfo: {
    type: string;
    screenSize: string;
    userAgent: string;
  };
}

// Interaction events
export interface InteractionEvent {
  type: 'click' | 'hover' | 'scroll' | 'purchase' | 'view' | 'add_to_cart';
  productId: string;
  timestamp: Date;
  coordinates?: { x: number; y: number };
  duration?: number;
  metadata?: Record<string, any>;
}

// Test results
export interface TestResult {
  testId: string;
  purchaseRate: number;
  averageTimeToFind: number;
  heatmapData: HeatmapPoint[];
  conversionFunnel: FunnelStep[];
  userEngagement: number;
  collectedAt: Date;
  recommendations?: string[];
}

// Heatmap data point
export interface HeatmapPoint {
  x: number;
  y: number;
  value: number;
  intensity: number;
}

// Funnel step
export interface FunnelStep {
  step: string;
  count: number;
  percentage: number;
  dropoff?: number;
}

// Dashboard metrics
export interface DashboardMetrics {
  totalTests: number;
  activeTests: number;
  totalParticipants: number;
  averageCompletionRate: number;
  topPerformingTest?: string;
}

// Optional: Type guards
export function isProduct(obj: any): obj is Product {
  return obj && typeof obj === 'object' && 'id' in obj && 'name' in obj && 'price' in obj;
}

export function isTestConfig(obj: any): obj is TestConfig {
  return obj && typeof obj === 'object' && 'id' in obj && 'name' in obj && 'shelfLayout' in obj;
}
