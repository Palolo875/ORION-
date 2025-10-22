/**
 * Tests pour le module sanitizer
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeContent,
  sanitizeUrl,
  detectMaliciousContent,
  sanitizeAttribute,
  sanitizeForSearch,
  sanitizeFilename
} from '../sanitizer';

describe('Sanitizer', () => {
  describe('sanitizeContent', () => {
    it('should preserve safe text content', () => {
      const safe = 'Hello world, this is safe text.';
      expect(sanitizeContent(safe)).toBe(safe);
    });

    it('should remove script tags', () => {
      const malicious = '<script>alert("xss")</script>Hello';
      const result = sanitizeContent(malicious);
      expect(result).not.toContain('<script>');
      expect(result).toContain('Hello');
    });

    it('should remove event handlers', () => {
      const malicious = '<div onclick="alert()">Click me</div>';
      const result = sanitizeContent(malicious);
      expect(result).not.toContain('onclick');
      expect(result).toContain('Click me');
    });

    it('should allow safe HTML tags when allowMarkdown is true', () => {
      const markdown = '<p>Paragraph</p><strong>Bold</strong>';
      const result = sanitizeContent(markdown, { allowMarkdown: true });
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
    });

    it('should strip all HTML when stripAll is true', () => {
      const html = '<p><strong>Bold</strong> text</p>';
      const result = sanitizeContent(html, { stripAll: true });
      expect(result).not.toContain('<');
      expect(result).toContain('Bold text');
    });

    it('should handle empty content', () => {
      expect(sanitizeContent('')).toBe('');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(sanitizeContent(null as any)).toBe('');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(sanitizeContent(undefined as any)).toBe('');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow http and https URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should allow mailto URLs', () => {
      expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
    });

    it('should allow anchor links', () => {
      expect(sanitizeUrl('#section')).toBe('#section');
    });

    it('should block javascript URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
    });

    it('should block data URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
    });

    it('should block vbscript URLs', () => {
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('#');
    });

    it('should block file URLs', () => {
      expect(sanitizeUrl('file:///etc/passwd')).toBe('#');
    });

    it('should handle empty URL', () => {
      expect(sanitizeUrl('')).toBe('#');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(sanitizeUrl(null as any)).toBe('#');
    });
  });

  describe('detectMaliciousContent', () => {
    it('should detect script tags', () => {
      const result = detectMaliciousContent('<script>alert(1)</script>');
      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('Balise script détectée');
    });

    it('should detect javascript protocol', () => {
      const result = detectMaliciousContent('javascript:alert(1)');
      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('Protocole javascript: détecté');
    });

    it('should detect event handlers', () => {
      const result = detectMaliciousContent('<div onclick="bad()">');
      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('Event handler inline détecté');
    });

    it('should detect iframes', () => {
      const result = detectMaliciousContent('<iframe src="evil.com">');
      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('Iframe détecté');
    });

    it('should detect eval', () => {
      const result = detectMaliciousContent('eval("bad code")');
      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('Fonction eval() détectée');
    });

    it('should not flag safe content', () => {
      const result = detectMaliciousContent('This is safe text');
      expect(result.isSuspicious).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });

    it('should handle empty content', () => {
      const result = detectMaliciousContent('');
      expect(result.isSuspicious).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe('sanitizeAttribute', () => {
    it('should preserve safe attributes', () => {
      expect(sanitizeAttribute('safe-value')).toBe('safe-value');
    });

    it('should remove dangerous characters', () => {
      const dangerous = 'value<script>"onclick=';
      const result = sanitizeAttribute(dangerous);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain('"');
    });

    it('should handle empty value', () => {
      expect(sanitizeAttribute('')).toBe('');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(sanitizeAttribute(null as any)).toBe('');
    });
  });

  describe('sanitizeForSearch', () => {
    it('should normalize text to lowercase', () => {
      expect(sanitizeForSearch('HELLO World')).toBe('hello world');
    });

    it('should normalize Unicode characters', () => {
      const result = sanitizeForSearch('café');
      expect(result).toBeTruthy();
    });

    it('should remove control characters', () => {
      const withControl = 'text\x00with\x1Fcontrol';
      const result = sanitizeForSearch(withControl);
      expect(result).not.toContain('\x00');
      expect(result).not.toContain('\x1F');
    });

    it('should trim whitespace', () => {
      expect(sanitizeForSearch('  text  ')).toBe('text');
    });

    it('should handle empty text', () => {
      expect(sanitizeForSearch('')).toBe('');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(sanitizeForSearch(null as any)).toBe('');
    });
  });

  describe('sanitizeFilename', () => {
    it('should preserve safe filenames', () => {
      expect(sanitizeFilename('document.pdf')).toBe('document.pdf');
      expect(sanitizeFilename('my-file_123.txt')).toBe('my-file_123.txt');
    });

    it('should replace dangerous characters', () => {
      const dangerous = 'file<>:"/\\|?*.txt';
      const result = sanitizeFilename(dangerous);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain(':');
      expect(result).not.toContain('/');
      expect(result).not.toContain('\\');
      expect(result).not.toContain('|');
      expect(result).not.toContain('?');
      expect(result).not.toContain('*');
    });

    it('should remove leading dots', () => {
      expect(sanitizeFilename('...file.txt')).not.toMatch(/^\./);
    });

    it('should remove trailing dots', () => {
      expect(sanitizeFilename('file.txt...')).not.toMatch(/\.$/);
    });

    it('should limit length to 255 characters', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const result = sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(255);
    });

    it('should return default for empty filename', () => {
      expect(sanitizeFilename('')).toBe('untitled');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(sanitizeFilename(null as any)).toBe('untitled');
    });
  });
});
