import React, { useState } from 'react';
import styled from 'styled-components';
import { useParams } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import type { TestResult } from '../../types/index';

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  color: #1e293b;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: #64748b;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const MetricCard = styled.div`
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  border: 1px solid #e2e8f0;
`;

const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #3b82f6;
  margin-bottom: 0.5rem;
`;

const MetricLabel = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
`;

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
`;

const ChartCard = styled.div`
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  border: 1px solid #e2e8f0;
`;

const ChartTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 1rem;
`;

const HeatmapGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-top: 1rem;
`;

const HeatmapCell = styled.div<{ intensity: number }>`
  aspect-ratio: 1;
  border-radius: 0.25rem;
  background-color: ${props => {
    if (props.intensity > 0.8) return '#3b82f6';
    if (props.intensity > 0.6) return '#60a5fa';
    if (props.intensity > 0.4) return '#93c5fd';
    if (props.intensity > 0.2) return '#bfdbfe';
    return '#dbeafe';
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: ${props => props.intensity > 0.5 ? 'white' : '#1e293b'};
`;

// Mock data for demonstration
const mockTestResult: TestResult = {
  testId: 'test_123',
  purchaseRate: 0.25,
  averageTimeToFind: 12.5,
  heatmapData: Array.from({ length: 16 }, (_, i) => ({
    x: Math.floor(i / 4),
    y: i % 4,
    value: Math.floor(Math.random() * 100),
    intensity: Math.random()
  })),
  conversionFunnel: [
    { step: 'Viewed', count: 1000, percentage: 100, dropoff: 0 },
    { step: 'Clicked', count: 350, percentage: 35, dropoff: 65 },
    { step: 'Added to Cart', count: 120, percentage: 12, dropoff: 23 },
    { step: 'Purchased', count: 85, percentage: 8.5, dropoff: 3.5 }
  ],
  userEngagement: 0.67,
  collectedAt: new Date(),
  recommendations: [
    'Move high-performing products to eye level',
    'Consider bundling frequently purchased items',
    'Improve contrast for low-engagement areas'
  ]
};

const timeSeriesData = [
  { time: '9:00', interactions: 45 },
  { time: '10:00', interactions: 68 },
  { time: '11:00', interactions: 89 },
  { time: '12:00', interactions: 120 },
  { time: '13:00', interactions: 95 },
  { time: '14:00', interactions: 110 },
  { time: '15:00', interactions: 78 },
  { time: '16:00', interactions: 65 }
];

const categoryData = [
  { category: 'Electronics', sales: 3200 },
  { category: 'Home', sales: 2400 },
  { category: 'Fashion', sales: 1800 },
  { category: 'Sports', sales: 1200 }
];

const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

const ResultsDashboard: React.FC<{ overview?: boolean }> = ({ overview = false }) => {
  const { testId } = useParams<{ testId: string }>();
  const [result, setResult] = useState<TestResult>(mockTestResult);

  // Format purchase rate as percentage
  const purchaseRatePercent = (result.purchaseRate * 100).toFixed(1);

  return (
    <Container>
      <Header>
        <Title>{overview ? 'Dashboard Overview' : 'Test Results'}</Title>
        <Subtitle>
          {overview ? 'All tests summary' : `Detailed analytics for test: ${testId}`}
        </Subtitle>
      </Header>

      <MetricsGrid>
        <MetricCard>
          <MetricValue>{purchaseRatePercent}%</MetricValue>
          <MetricLabel>Purchase Rate</MetricLabel>
        </MetricCard>
        <MetricCard>
          <MetricValue>{result.averageTimeToFind}s</MetricValue>
          <MetricLabel>Avg Time to Find</MetricLabel>
        </MetricCard>
        <MetricCard>
          <MetricValue>{(result.userEngagement * 100).toFixed(1)}%</MetricValue>
          <MetricLabel>User Engagement</MetricLabel>
        </MetricCard>
        <MetricCard>
          <MetricValue>{result.conversionFunnel[0].count}</MetricValue>
          <MetricLabel>Total Views</MetricLabel>
        </MetricCard>
      </MetricsGrid>

      <ChartGrid>
        <ChartCard>
          <ChartTitle>Conversion Funnel</ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={result.conversionFunnel}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="step" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                formatter={(value) => [`${value}%`, 'Conversion']}
                labelStyle={{ color: '#334155' }}
              />
              <Legend />
              <Bar dataKey="percentage" fill="#3b82f6" name="Conversion Rate" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard>
          <ChartTitle>Interactions Over Time</ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                labelStyle={{ color: '#334155' }}
                formatter={(value) => [`${value}`, 'Interactions']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="interactions"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ stroke: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Interactions"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard>
          <ChartTitle>Category Performance</ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="sales"
              >
                {categoryData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`$${value}`, 'Sales']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard>
          <ChartTitle>Heatmap - Product Engagement</ChartTitle>
          <div className="text-sm text-gray-600 mb-4">
            Color intensity shows interaction frequency
          </div>
          <HeatmapGrid>
            {result.heatmapData.map((point, index) => (
              <HeatmapCell key={index} intensity={point.intensity}>
                {point.value}
              </HeatmapCell>
            ))}
          </HeatmapGrid>
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-100 rounded mr-2"></div>
              <span>Low engagement</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-600 rounded mr-2"></div>
              <span>High engagement</span>
            </div>
          </div>
        </ChartCard>
      </ChartGrid>

      {result.recommendations && result.recommendations.length > 0 && (
        <ChartCard>
          <ChartTitle>AI Recommendations</ChartTitle>
          <ul className="space-y-2">
            {result.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                  {index + 1}
                </div>
                <span className="text-gray-700">{rec}</span>
              </li>
            ))}
          </ul>
        </ChartCard>
      )}
    </Container>
  );
};

export default ResultsDashboard;
