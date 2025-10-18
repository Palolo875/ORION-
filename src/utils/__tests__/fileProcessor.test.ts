import { describe, it, expect } from 'vitest';
import { 
  isSupportedFileType, 
  getFileCategory, 
  formatFileSize,
  SUPPORTED_FILE_TYPES 
} from '../fileProcessor';

describe('fileProcessor', () => {
  describe('isSupportedFileType', () => {
    it('should return true for supported image types', () => {
      SUPPORTED_FILE_TYPES.images.forEach(type => {
        expect(isSupportedFileType(type)).toBe(true);
      });
    });

    it('should return true for supported document types', () => {
      SUPPORTED_FILE_TYPES.documents.forEach(type => {
        expect(isSupportedFileType(type)).toBe(true);
      });
    });

    it('should return true for supported code types', () => {
      SUPPORTED_FILE_TYPES.code.forEach(type => {
        expect(isSupportedFileType(type)).toBe(true);
      });
    });

    it('should return true for text/ types', () => {
      expect(isSupportedFileType('text/plain')).toBe(true);
      expect(isSupportedFileType('text/html')).toBe(true);
      expect(isSupportedFileType('text/css')).toBe(true);
    });

    it('should return false for unsupported types', () => {
      expect(isSupportedFileType('video/mp4')).toBe(false);
      expect(isSupportedFileType('audio/mp3')).toBe(false);
      expect(isSupportedFileType('application/octet-stream')).toBe(false);
    });
  });

  describe('getFileCategory', () => {
    it('should categorize images correctly', () => {
      expect(getFileCategory('image/jpeg')).toBe('image');
      expect(getFileCategory('image/png')).toBe('image');
      expect(getFileCategory('image/gif')).toBe('image');
    });

    it('should categorize documents correctly', () => {
      expect(getFileCategory('application/pdf')).toBe('document');
      expect(getFileCategory('application/json')).toBe('document');
    });

    it('should categorize code files correctly', () => {
      expect(getFileCategory('text/javascript')).toBe('code');
      expect(getFileCategory('application/typescript')).toBe('code');
    });

    it('should categorize text files correctly', () => {
      // Note: text/csv est dans documents, utilisons un type text/ générique
      expect(getFileCategory('text/x-custom')).toBe('text');
    });

    it('should return unknown for unsupported types', () => {
      expect(getFileCategory('video/mp4')).toBe('unknown');
      expect(getFileCategory('audio/mp3')).toBe('unknown');
    });
  });

  describe('formatFileSize', () => {
    it('should format 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
      expect(formatFileSize(1023)).toBe('1023 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(10240)).toBe('10 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
      expect(formatFileSize(10485760)).toBe('10 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(1610612736)).toBe('1.5 GB');
    });

    it('should round to 2 decimal places', () => {
      expect(formatFileSize(1536000)).toMatch(/^1\.\d{1,2} MB$/);
    });
  });
});
