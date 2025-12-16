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

export interface InteractionEvent {
  type: 'click' | 'hover' | 'scroll' | 'purchase' | 'view' | 'add_to_cart';
  productId: string;
  timestamp: Date;
  coordinates?: { x: number; y: number };
  duration?: number;
  metadata?: Record<string, any>;
}

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

export interface HeatmapPoint {
  x: number;
  y: number;
  value: number;
  intensity: number;
}

export interface FunnelStep {
  step: string;
  count: number;
  percentage: number;
  dropoff?: number;
}

export interface DashboardMetrics {
  totalTests: number;
  activeTests: number;
  totalParticipants: number;
  averageCompletionRate: number;
  topPerformingTest?: string;
}
