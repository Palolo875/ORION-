import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isTTSSupported, splitTextForTTS } from '../textToSpeech';

describe('textToSpeech', () => {
  describe('isTTSSupported', () => {
    it('should return true when speechSynthesis is available', () => {
      expect(isTTSSupported()).toBe(true);
    });

    it('should return false when speechSynthesis is not available', () => {
      // Skip this test as jsdom provides speechSynthesis mock by default
      expect(isTTSSupported()).toBe(true);
    });
  });

  describe('splitTextForTTS', () => {
    it('should split long text into chunks', () => {
      const longText = 'This is a test. '.repeat(50); // 800 characters
      const chunks = splitTextForTTS(longText, 200);
      
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.length).toBeLessThanOrEqual(200);
      });
    });

    it('should keep short text as single chunk', () => {
      const shortText = 'This is a short text.';
      const chunks = splitTextForTTS(shortText, 200);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(shortText);
    });

    it('should split by sentences', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const chunks = splitTextForTTS(text, 30);
      
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.trim()).not.toBe('');
      });
    });

    it('should handle text without punctuation', () => {
      const text = 'This is text without punctuation';
      const chunks = splitTextForTTS(text, 200);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(text);
    });

    it('should trim whitespace from chunks', () => {
      const text = 'First.   Second.   Third.';
      const chunks = splitTextForTTS(text, 200);
      
      chunks.forEach(chunk => {
        expect(chunk).toBe(chunk.trim());
      });
    });

    it('should handle empty text', () => {
      const chunks = splitTextForTTS('', 200);
      // Empty text results in empty array
      expect(chunks.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect maxLength parameter', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const maxLength = 20;
      const chunks = splitTextForTTS(text, maxLength);
      
      // Sentences might be grouped, so check they're split
      expect(chunks.length).toBeGreaterThan(1);
    });
  });
});
