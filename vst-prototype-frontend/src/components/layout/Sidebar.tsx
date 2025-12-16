import React from 'react';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';

const SidebarContainer = styled.aside`
  width: 16rem;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  color: white;
  padding: 1.5rem;
  display: none;
  
  @media (min-width: 768px) {
    display: flex;
    flex-direction: column;
  }
`;

const Logo = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  &::before {
    content: '🧪';
    font-size: 2rem;
  }
`;

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  color: #cbd5e1;
  text-decoration: none;
  transition: all 0.2s ease;
  margin-bottom: 0.5rem;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: white;
  }
  
  &.active {
    background-color: #3b82f6;
    color: white;
  }
  
  &::before {
    font-size: 1.25rem;
  }
`;

const Sidebar: React.FC = () => {
  return (
    <SidebarContainer className="glass-panel">
      <Logo>VST Prototype</Logo>
      <nav className="flex flex-col flex-1">
        <NavItem to="/setup">
          <span>⚡</span>
          <span>Test Setup</span>
        </NavItem>
        <NavItem to="/shelf/demo">
          <span>🛒</span>
          <span>Virtual Shelf</span>
        </NavItem>
        <NavItem to="/dashboard">
          <span>📊</span>
          <span>Dashboard</span>
        </NavItem>
        <NavItem to="/results/demo">
          <span>📈</span>
          <span>Results</span>
        </NavItem>
      </nav>
      <div className="mt-auto pt-4 border-t border-gray-700">
        <div className="text-sm text-gray-400">Status: <span className="text-green-400">Online</span></div>
      </div>
    </SidebarContainer>
  );
};

export default Sidebar;
