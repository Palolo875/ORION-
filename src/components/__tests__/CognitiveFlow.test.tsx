import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CognitiveFlow } from '../CognitiveFlow';
import type { FlowStep } from '@/utils/cognitiveFlowConstants';

console.log('🎭 Tests avec MOCKS (rapide)');

describe('CognitiveFlow', () => {
  it('should render cognitive flow component', () => {
    render(
      <CognitiveFlow 
        currentStep="idle" 
        stepDetails="Prêt à recevoir une requête." 
      />
    );
    
    expect(screen.getByTestId('cognitive-flow')).toBeInTheDocument();
  });

  it('should display flow title', () => {
    render(
      <CognitiveFlow 
        currentStep="idle" 
        stepDetails="Prêt à recevoir une requête." 
      />
    );
    
    expect(screen.getByText(/Flux Cognitif/i)).toBeInTheDocument();
  });

  it('should render different flow steps', () => {
    const steps: FlowStep[] = ['query', 'tool_search', 'memory_search', 'llm_reasoning', 'final_response'];
    
    // Test each step individually
    steps.forEach(step => {
      const { unmount } = render(
        <CognitiveFlow 
          currentStep={step} 
          stepDetails={`Processing ${step}`} 
        />
      );
      
      expect(screen.getByTestId('cognitive-flow')).toBeInTheDocument();
      unmount();
    });
  });

  it('should display step details', () => {
    const stepDetails = "Analyzing your question";
    render(
      <CognitiveFlow 
        currentStep="query" 
        stepDetails={stepDetails} 
      />
    );
    
    expect(screen.getByText(stepDetails)).toBeInTheDocument();
  });

  it('should handle idle state', () => {
    render(
      <CognitiveFlow 
        currentStep="idle" 
        stepDetails="Prêt" 
      />
    );
    
    expect(screen.getByTestId('cognitive-flow')).toBeInTheDocument();
  });
});
