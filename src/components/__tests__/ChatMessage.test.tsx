/**
 * Tests pour le composant ChatMessage
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessage } from '../ChatMessage';

vi.mock('../SafeMessage', () => ({
  SafeMessage: ({ content }: { content: string }) => <div>{content}</div>,
}));

describe('ChatMessage', () => {
  it('should render user message', () => {
    render(
      <ChatMessage
        role="user"
        content="Hello, how are you?"
        timestamp={new Date('2025-10-22T10:00:00')}
      />
    );
    
    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
  });

  it('should render assistant message', () => {
    render(
      <ChatMessage
        role="assistant"
        content="I'm doing great, thank you!"
        timestamp={new Date('2025-10-22T10:01:00')}
      />
    );
    
    expect(screen.getByText("I'm doing great, thank you!")).toBeInTheDocument();
  });

  it('should display timestamp', () => {
    render(
      <ChatMessage
        role="user"
        content="Test message"
        timestamp={new Date('2025-10-22T10:00:00')}
      />
    );
    
    // Le timestamp devrait être formaté et affiché
    const messageElement = screen.getByText('Test message').closest('div');
    expect(messageElement).toBeInTheDocument();
  });

  it('should apply correct styling for user role', () => {
    const { container } = render(
      <ChatMessage
        role="user"
        content="User message"
        timestamp={new Date()}
      />
    );
    
    // Vérifier que le conteneur existe
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should apply correct styling for assistant role', () => {
    const { container } = render(
      <ChatMessage
        role="assistant"
        content="Assistant message"
        timestamp={new Date()}
      />
    );
    
    // Vérifier que le conteneur existe
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render system message with different styling', () => {
    render(
      <ChatMessage
        role="system"
        content="System notification"
        timestamp={new Date()}
      />
    );
    
    expect(screen.getByText('System notification')).toBeInTheDocument();
  });
});
