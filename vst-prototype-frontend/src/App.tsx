import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import styled from 'styled-components';
import TestSetupWizard from './components/TestSetupWizard/TestSetupWizard';
import VirtualShelfViewer from './components/VirtualShelf/VirtualShelfViewer';
import ResultsDashboard from './components/ResultsDashboard/ResultsDashboard';
import Navigation from './components/common/Navigation';
import Sidebar from './components/layout/Sidebar';

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
`;

const MainContent = styled.main`
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  
  @media (min-width: 768px) {
    padding: 3rem;
  }
`;

function App() {
  return (
    <Router>
      <AppContainer>
        <Sidebar />
        <MainContent className="bg-gradient-to-br from-gray-50 to-white">
          <Routes>
            <Route path="/" element={<Navigate to="/setup" replace />} />
            <Route path="/setup" element={<TestSetupWizard />} />
            <Route path="/shelf/:testId" element={<VirtualShelfViewer />} />
            <Route path="/results/:testId" element={<ResultsDashboard />} />
            <Route path="/dashboard" element={<ResultsDashboard overview />} />
          </Routes>
        </MainContent>
      </AppContainer>
    </Router>
  );
}

export default App;
