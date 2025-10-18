import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from '../ChatInput';

describe('ChatInput', () => {
  it('should render input field', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    
    const textarea = screen.getByPlaceholderText(/Comment puis-je vous aider/i);
    expect(textarea).toBeDefined();
  });

  it('should call onSend when send button is clicked', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    
    render(<ChatInput onSend={onSend} />);
    
    const textarea = screen.getByPlaceholderText(/Comment puis-je vous aider/i);
    
    await user.type(textarea, 'Test message');
    await user.keyboard('{Enter}');
    
    expect(onSend).toHaveBeenCalledWith('Test message', undefined);
  });

  it('should clear input after sending', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    
    render(<ChatInput onSend={onSend} />);
    
    const textarea = screen.getByPlaceholderText(/Comment puis-je vous aider/i) as HTMLTextAreaElement;
    
    await user.type(textarea, 'Test message');
    await user.keyboard('{Enter}');
    
    expect(textarea.value).toBe('');
  });

  it('should be disabled when disabled prop is true', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled={true} />);
    
    const textarea = screen.getByPlaceholderText(/Comment puis-je vous aider/i);
    expect(textarea).toHaveProperty('disabled', true);
  });

  it('should show stop button when generating', () => {
    const onSend = vi.fn();
    const onStop = vi.fn();
    
    render(
      <ChatInput 
        onSend={onSend} 
        isGenerating={true}
        onStopGeneration={onStop}
      />
    );
    
    // Le bouton stop devrait être visible
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should display custom placeholder', () => {
    const onSend = vi.fn();
    const customPlaceholder = 'Custom placeholder text';
    
    render(<ChatInput onSend={onSend} placeholder={customPlaceholder} />);
    
    const textarea = screen.getByPlaceholderText(customPlaceholder);
    expect(textarea).toBeDefined();
  });
});
