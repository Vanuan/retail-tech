import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import type { TestConfig } from '../../types';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: #1e293b;
`;

const Subtitle = styled.p`
  color: #64748b;
  margin-bottom: 2rem;
`;

const WizardContainer = styled.div`
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  padding: 2rem;
`;

const StepContainer = styled.div`
  margin-bottom: 2rem;
`;

const StepTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #334155;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #475569;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const Button = styled.button`
  background: #3b82f6;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: #2563eb;
  }

  &:disabled {
    background: #cbd5e1;
    cursor: not-allowed;
  }
`;

const TestSetupWizard: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [testConfig, setTestConfig] = useState<TestConfig>({
    id: '',
    name: '',
    description: '',
    products: [],
    shelfLayout: {
      rows: 3,
      columns: 4,
      spacing: 16,
      orientation: 'grid'
    },
    metrics: ['click', 'hover', 'purchase'],
    createdAt: new Date(),
    status: 'draft'
  });

  const handleInputChange = (field: keyof TestConfig, value: any) => {
    setTestConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleShelfLayoutChange = (field: keyof TestConfig['shelfLayout'], value: number | string) => {
    setTestConfig(prev => ({
      ...prev,
      shelfLayout: {
        ...prev.shelfLayout,
        [field]: value
      }
    }));
  };

  const handleSubmit = () => {
    // Generate a test ID
    const testId = `test_${Date.now()}`;
    const finalConfig = {
      ...testConfig,
      id: testId,
      createdAt: new Date()
    };

    // In a real app, you would save this to a backend
    console.log('Test configuration:', finalConfig);

    // Navigate to the virtual shelf
    navigate(`/shelf/${testId}`);
  };

  const renderStep1 = () => (
    <StepContainer>
      <StepTitle>Basic Information</StepTitle>
      <FormGroup>
        <Label>Test Name</Label>
        <Input
          type="text"
          value={testConfig.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Enter test name"
        />
      </FormGroup>
      <FormGroup>
        <Label>Description</Label>
        <TextArea
          value={testConfig.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Describe what you want to test..."
        />
      </FormGroup>
    </StepContainer>
  );

  const renderStep2 = () => (
    <StepContainer>
      <StepTitle>Shelf Layout Configuration</StepTitle>
      <div className="grid grid-cols-2 gap-4">
        <FormGroup>
          <Label>Number of Rows</Label>
          <Input
            type="number"
            min="1"
            max="10"
            value={testConfig.shelfLayout.rows}
            onChange={(e) => handleShelfLayoutChange('rows', parseInt(e.target.value))}
          />
        </FormGroup>
        <FormGroup>
          <Label>Number of Columns</Label>
          <Input
            type="number"
            min="1"
            max="10"
            value={testConfig.shelfLayout.columns}
            onChange={(e) => handleShelfLayoutChange('columns', parseInt(e.target.value))}
          />
        </FormGroup>
        <FormGroup>
          <Label>Spacing (px)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={testConfig.shelfLayout.spacing}
            onChange={(e) => handleShelfLayoutChange('spacing', parseInt(e.target.value))}
          />
        </FormGroup>
      </div>
    </StepContainer>
  );

  const renderStep3 = () => (
    <StepContainer>
      <StepTitle>Metrics to Track</StepTitle>
      <div className="space-y-2">
        {['click', 'hover', 'scroll', 'purchase', 'view'].map((metric) => (
          <label key={metric} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={testConfig.metrics.includes(metric)}
              onChange={(e) => {
                const newMetrics = e.target.checked
                  ? [...testConfig.metrics, metric]
                  : testConfig.metrics.filter(m => m !== metric);
                handleInputChange('metrics', newMetrics);
              }}
              className="rounded border-gray-300"
            />
            <span className="capitalize">{metric.replace('_', ' ')}</span>
          </label>
        ))}
      </div>
    </StepContainer>
  );

  return (
    <Container>
      <Title>Test Setup Wizard</Title>
      <Subtitle>Configure your virtual shelf test in 3 simple steps</Subtitle>

      <WizardContainer>
        {/* Step Progress */}
        <div className="flex justify-between mb-8">
          {[1, 2, 3].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center
                ${step >= stepNum ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
              `}>
                {stepNum}
              </div>
              <div className="ml-2 text-sm font-medium">
                {stepNum === 1 && 'Basic Info'}
                {stepNum === 2 && 'Layout'}
                {stepNum === 3 && 'Metrics'}
              </div>
              {stepNum < 3 && (
                <div className="w-12 h-0.5 bg-gray-300 mx-2"></div>
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t">
          {step > 1 ? (
            <Button
              onClick={() => setStep(step - 1)}
              className="bg-gray-600 hover:bg-gray-700"
            >
              Previous
            </Button>
          ) : (
            <div></div>
          )}

          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)}>
              Next Step
            </Button>
          ) : (
            <Button onClick={handleSubmit}>
              Start Test
            </Button>
          )}
        </div>
      </WizardContainer>
    </Container>
  );
};

export default TestSetupWizard;
