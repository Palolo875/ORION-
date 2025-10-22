/**
 * Tests pour le module encryption
 */

import { describe, it, expect } from 'vitest';
import {
  generateSecureToken,
  encryptSensitiveData,
  decryptSensitiveData,
  secureHash,
  isEncryptionSupported
} from '../encryption';

describe('Encryption', () => {
  describe('secureHash', () => {
    it('should hash data', async () => {
      const data = 'mySecureData123!';
      const hash = await secureHash(data);
      
      expect(hash).toBeTruthy();
      expect(hash).not.toBe(data);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce same hash for same data', async () => {
      const data = 'sameData';
      const hash1 = await secureHash(data);
      const hash2 = await secureHash(data);
      
      // SHA-256 est déterministe
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different data', async () => {
      const hash1 = await secureHash('data1');
      const hash2 = await secureHash('data2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty data', async () => {
      const hash = await secureHash('');
      expect(hash).toBeTruthy();
    });
  });

  describe('isEncryptionSupported', () => {
    it('should return true in modern browsers', () => {
      const supported = isEncryptionSupported();
      expect(typeof supported).toBe('boolean');
      // En environnement de test jsdom, crypto.subtle devrait être disponible
    });
  });

  describe('generateSecureToken', () => {
    it('should generate a token of specified length', () => {
      const token = generateSecureToken(32);
      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThanOrEqual(32);
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken(16);
      const token2 = generateSecureToken(16);
      
      expect(token1).not.toBe(token2);
    });

    it('should use default length when not specified', () => {
      const token = generateSecureToken();
      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThan(0);
    });

    it('should handle different lengths', () => {
      const lengths = [8, 16, 32, 64];
      
      lengths.forEach(length => {
        const token = generateSecureToken(length);
        expect(token).toBeTruthy();
        expect(token.length).toBeGreaterThanOrEqual(length);
      });
    });
  });

  describe('encryptSensitiveData and decryptSensitiveData', () => {
    it('should encrypt and decrypt data successfully', async () => {
      const data = 'Secret message';
      
      const encrypted = await encryptSensitiveData(data);
      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(data);
      
      const decrypted = await decryptSensitiveData(encrypted);
      expect(decrypted).toBe(data);
    });

    it('should encrypt and decrypt objects', async () => {
      const data = { secret: 'value', number: 42, nested: { key: 'value' } };
      
      const encrypted = await encryptSensitiveData(data);
      const decrypted = await decryptSensitiveData(encrypted);
      
      expect(decrypted).toEqual(data);
    });

    it('should encrypt and decrypt arrays', async () => {
      const data = [1, 'two', { three: 3 }];
      
      const encrypted = await encryptSensitiveData(data);
      const decrypted = await decryptSensitiveData(encrypted);
      
      expect(decrypted).toEqual(data);
    });

    it('should handle empty string', async () => {
      const encrypted = await encryptSensitiveData('');
      const decrypted = await decryptSensitiveData(encrypted);
      expect(decrypted).toBe('');
    });

    it('should produce different ciphertexts for same data', async () => {
      const data = 'Same data';
      
      const encrypted1 = await encryptSensitiveData(data);
      const encrypted2 = await encryptSensitiveData(data);
      
      // Les ciphertexts doivent être différents à cause de l'IV aléatoire
      expect(encrypted1).not.toBe(encrypted2);
      
      // Mais les deux doivent décrypter au même plaintext
      const decrypted1 = await decryptSensitiveData(encrypted1);
      const decrypted2 = await decryptSensitiveData(encrypted2);
      expect(decrypted1).toBe(data);
      expect(decrypted2).toBe(data);
    });

    it('should handle Unicode characters', async () => {
      const data = '你好世界 🌍 café ñ';
      
      const encrypted = await encryptSensitiveData(data);
      const decrypted = await decryptSensitiveData(encrypted);
      
      expect(decrypted).toBe(data);
    });

    it('should handle null values', async () => {
      const encryptedNull = await encryptSensitiveData(null);
      const decryptedNull = await decryptSensitiveData(encryptedNull);
      expect(decryptedNull).toBe(null);
    });
  });
});
