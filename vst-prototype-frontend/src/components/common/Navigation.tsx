import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const NavContainer = styled.nav`
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Logo = styled(Link)`
  font-size: 1.5rem;
  font-weight: bold;
  color: #3b82f6;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &::before {
    content: '🧪';
    font-size: 2rem;
  }
`;

const NavLinks = styled.div`
  display: flex;
  gap: 2rem;
  
  @media (max-width: 768px) {
    gap: 1rem;
  }
`;

const NavLink = styled(Link)<{ active: boolean }>`
  color: ${props => props.active ? '#3b82f6' : '#64748b'};
  text-decoration: none;
  font-weight: ${props => props.active ? '600' : '500'};
  padding: 0.5rem 0;
  position: relative;
  transition: color 0.2s;
  
  &:hover {
    color: #3b82f6;
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: #3b82f6;
    transform: scaleX(${props => props.active ? 1 : 0});
    transition: transform 0.2s;
  }
`;

const StatusBadge = styled.span`
  background: #d1fae5;
  color: #065f46;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
`;

const Navigation: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <NavContainer>
      <Logo to="/">VST Prototype</Logo>
      
      <NavLinks>
        <NavLink to="/setup" active={isActive('/setup')}>
          Test Setup
        </NavLink>
        <NavLink to="/shelf/demo" active={isActive('/shelf')}>
          Virtual Shelf
        </NavLink>
        <NavLink to="/dashboard" active={isActive('/dashboard') || isActive('/results')}>
          Results
        </NavLink>
      </NavLinks>
      
      <StatusBadge>Online</StatusBadge>
    </NavContainer>
  );
};

export default Navigation;
