import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useParams, useNavigate } from 'react-router-dom';
import type { Product } from '../../types/index';
import ShelfGrid from './ShelfGrid/ShelfGrid';
import ProductCard from './ProductCard/ProductCard';

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
`;

const Subtitle = styled.p`
  color: #64748b;
  margin-bottom: 1rem;
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  border: 1px solid #e2e8f0;
`;

const StatValue = styled.div`
  font-size: 1.875rem;
  font-weight: bold;
  color: #3b82f6;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.25rem;
`;

const Controls = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  align-items: center;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
`;

const PrimaryButton = styled(Button)`
  background: #3b82f6;
  color: white;
  border: none;

  &:hover {
    background: #2563eb;
  }
`;

const SecondaryButton = styled(Button)`
  background: white;
  color: #475569;
  border: 1px solid #cbd5e1;

  &:hover {
    background: #f8fafc;
  }
`;

// Mock data for demonstration
const mockProducts: Product[] = Array.from({ length: 12 }, (_, i) => ({
  id: `product_${i + 1}`,
  name: `Product ${i + 1}`,
  price: Math.floor(Math.random() * 100) + 20,
  imageUrl: `https://picsum.photos/200/200?random=${i + 1}`,
  category: ['Electronics', 'Home', 'Fashion', 'Sports'][Math.floor(Math.random() * 4)],
  brand: ['Brand A', 'Brand B', 'Brand C', 'Brand D'][Math.floor(Math.random() * 4)],
  rating: Math.random() * 3 + 2, // 2-5
  stock: Math.floor(Math.random() * 100),
  position: {
    row: Math.floor(i / 4),
    column: i % 4
  }
}));

const VirtualShelfViewer: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [products] = useState<Product[]>(mockProducts);
  const [interactions, setInteractions] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning) {
      timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning]);

  const handleProductClick = useCallback((productId: string) => {
    setInteractions(prev => prev + 1);
    console.log(`Product ${productId} clicked`);

    // Simulate a purchase 20% of the time
    if (Math.random() < 0.2) {
      console.log(`Purchase made: ${productId}`);
    }
  }, []);

  const handleProductHover = (productId: string, duration: number) => {
    console.log(`Product ${productId} hovered for ${duration}ms`);
  };

  const handleViewResults = () => {
    navigate(`/results/${testId}`);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Container>
      <Header>
        <Title>Virtual Shelf Test</Title>
        <Subtitle>Test ID: {testId}</Subtitle>

        <StatsContainer>
          <StatCard>
            <StatValue>{products.length}</StatValue>
            <StatLabel>Products</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{interactions}</StatValue>
            <StatLabel>Interactions</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{formatTime(timeElapsed)}</StatValue>
            <StatLabel>Time Elapsed</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{isRunning ? 'Active' : 'Paused'}</StatValue>
            <StatLabel>Status</StatLabel>
          </StatCard>
        </StatsContainer>

        <Controls>
          <PrimaryButton onClick={handleViewResults}>
            View Results
          </PrimaryButton>
          <SecondaryButton onClick={() => setIsRunning(!isRunning)}>
            {isRunning ? 'Pause Test' : 'Resume Test'}
          </SecondaryButton>
          <div className="text-sm text-gray-600">
            Simulate user interactions by clicking on products
          </div>
        </Controls>
      </Header>

      <ShelfGrid
        rows={3}
        columns={4}
        spacing={16}
        onProductClick={handleProductClick}
        onProductHover={handleProductHover}
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={() => handleProductClick(product.id)}
            onHover={(duration) => handleProductHover(product.id, duration)}
          />
        ))}
      </ShelfGrid>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-2">Test Instructions</h3>
        <ul className="text-blue-800 space-y-1">
          <li>• Click on products to simulate user interactions</li>
          <li>• Hover over products to track attention duration</li>
          <li>• Monitor the stats above to see real-time metrics</li>
          <li>• Click "View Results" to see detailed analytics</li>
        </ul>
      </div>
    </Container>
  );
};

export default VirtualShelfViewer;
