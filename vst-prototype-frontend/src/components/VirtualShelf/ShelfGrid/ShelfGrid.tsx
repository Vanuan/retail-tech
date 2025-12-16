import React from 'react';
import styled from 'styled-components';

interface ShelfGridProps {
  rows: number;
  columns: number;
  spacing: number;
  children: React.ReactNode;
  onProductClick?: (productId: string) => void;
  onProductHover?: (productId: string, duration: number) => void;
}

const GridContainer = styled.div<{ columns: number; spacing: number }>`
  display: grid;
  grid-template-columns: repeat(${props => props.columns}, 1fr);
  gap: ${props => props.spacing}px;
  padding: 2rem;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 1rem;
  border: 2px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  min-height: 600px;
  position: relative;
  overflow: hidden;
`;

const ShelfGrid: React.FC<ShelfGridProps> = ({
  rows,
  columns,
  spacing,
  children,
  onProductClick,
  onProductHover
}) => {
  return (
    <GridContainer columns={columns} spacing={spacing}>
      {children}
    </GridContainer>
  );
};

export default ShelfGrid;
