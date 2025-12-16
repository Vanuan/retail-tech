import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import type { Product } from '../../../types/index';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  onHover: (duration: number) => void;
}

const CardContainer = styled.div`
  background: white;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
    border-color: #3b82f6;
  }
`;

const ImageContainer = styled.div`
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  position: relative;
`;

const ProductImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;

  ${CardContainer}:hover & {
    transform: scale(1.05);
  }
`;

const ProductInfo = styled.div`
  padding: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const ProductName = styled.h3`
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
  line-height: 1.2;
`;

const ProductCategory = styled.span`
  font-size: 0.75rem;
  color: #64748b;
  background: #f1f5f9;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  display: inline-block;
  margin-bottom: 0.5rem;
  align-self: flex-start;
`;

const Price = styled.div`
  font-size: 1.125rem;
  font-weight: bold;
  color: #3b82f6;
  margin-top: auto;
`;

const RatingContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const Star = styled.span`
  color: #fbbf24;
  font-size: 0.875rem;
`;

const StockBadge = styled.span<{ low: boolean }>`
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  background: ${props => props.low ? '#fef3c7' : '#d1fae5'};
  color: ${props => props.low ? '#92400e' : '#065f46'};
  margin-left: auto;
`;

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, onHover }) => {
  const [hoverStartTime, setHoverStartTime] = useState<number | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    const startTime = Date.now();
    setHoverStartTime(startTime);

    hoverTimerRef.current = setTimeout(() => {
      const duration = Date.now() - startTime;
      onHover(duration);
    }, 1000); // Track hover after 1 second
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    if (hoverStartTime) {
      const duration = Date.now() - hoverStartTime;
      if (duration >= 500) { // Only track hovers longer than 500ms
        onHover(duration);
      }
      setHoverStartTime(null);
    }
  };

  const handleClick = () => {
    onClick();
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    return (
      <>
        {'★'.repeat(fullStars)}
        {hasHalfStar && '½'}
        {'☆'.repeat(5 - fullStars - (hasHalfStar ? 1 : 0))}
      </>
    );
  };

  const isLowStock = product.stock < 20;

  return (
    <CardContainer
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <ImageContainer>
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://picsum.photos/200/200?random=${Math.random()}`;
          }}
        />
      </ImageContainer>

      <ProductInfo>
        <ProductCategory>{product.category}</ProductCategory>
        <ProductName>{product.name}</ProductName>
        <div className="text-xs text-gray-500 mb-2">{product.brand}</div>

        <RatingContainer>
          <Star>{renderStars(product.rating)}</Star>
          <StockBadge low={isLowStock}>
            {isLowStock ? 'Low Stock' : 'In Stock'}
          </StockBadge>
        </RatingContainer>

        <Price>${product.price.toFixed(2)}</Price>
      </ProductInfo>
    </CardContainer>
  );
};

export default ProductCard;
