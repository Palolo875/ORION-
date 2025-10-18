/**
 * Système d'encryption pour ORION
 * Chiffrement AES-GCM pour les données sensibles dans IndexedDB
 */

import { logger } from './logger';

/**
 * Classe de chiffrement sécurisé pour le stockage local
 */
class SecureStorage {
  private encryptionKey: CryptoKey | null = null;
  private initialized = false;
  private readonly SALT = 'orion-secure-salt-v1';
  private readonly ITERATIONS = 100000;

  /**
   * Initialiser avec une clé dérivée du device
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Dériver une clé unique basée sur l'appareil
      const deviceId = await this.getDeviceFingerprint();
      
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(deviceId),
        'PBKDF2',
        false,
        ['deriveKey']
      );
      
      this.encryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode(this.SALT),
          iterations: this.ITERATIONS,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      this.initialized = true;
      logger.info('SecureStorage', 'Encryption initialisée avec succès');
    } catch (error) {
      logger.error('SecureStorage', 'Erreur initialisation encryption', error);
      throw error;
    }
  }
  
  /**
   * Chiffrer des données
   */
  async encrypt(data: unknown): Promise<string> {
    if (!this.initialized) await this.initialize();
    if (!this.encryptionKey) throw new Error('Encryption key not initialized');

    try {
      const jsonData = JSON.stringify(data);
      const encodedData = new TextEncoder().encode(jsonData);
      
      // IV aléatoire pour chaque chiffrement (12 bytes pour GCM)
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        encodedData
      );
      
      // Concaténer IV + données chiffrées
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedData), iv.length);
      
      // Encoder en base64 pour stockage
      return this.arrayBufferToBase64(combined);
    } catch (error) {
      logger.error('SecureStorage', 'Erreur encryption', error);
      throw error;
    }
  }
  
  /**
   * Déchiffrer des données
   */
  async decrypt(encryptedString: string): Promise<unknown> {
    if (!this.initialized) await this.initialize();
    if (!this.encryptionKey) throw new Error('Encryption key not initialized');

    try {
      // Décoder base64
      const combined = this.base64ToArrayBuffer(encryptedString);
      
      // Extraire IV (12 premiers bytes) et données
      const iv = combined.slice(0, 12);
      const encryptedData = combined.slice(12);
      
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        encryptedData
      );
      
      const jsonData = new TextDecoder().decode(decryptedData);
      return JSON.parse(jsonData);
    } catch (error) {
      logger.error('SecureStorage', 'Erreur decryption', error);
      throw error;
    }
  }

  /**
   * Vérifier si l'encryption est disponible
   */
  isSupported(): boolean {
    return typeof crypto !== 'undefined' && 
           typeof crypto.subtle !== 'undefined' &&
           typeof crypto.subtle.encrypt === 'function';
  }
  
  /**
   * Hash sécurisé (pour identifiants, checksums)
   */
  async hash(data: string): Promise<string> {
    try {
      const encoded = new TextEncoder().encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
      return this.arrayBufferToBase64(new Uint8Array(hashBuffer));
    } catch (error) {
      logger.error('SecureStorage', 'Erreur hashing', error);
      throw error;
    }
  }

  /**
   * Générer un token aléatoire sécurisé
   */
  generateToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return this.arrayBufferToBase64(array);
  }
  
  /**
   * Fingerprint simple de l'appareil
   * Combine plusieurs caractéristiques du navigateur/device
   */
  private async getDeviceFingerprint(): Promise<string> {
    const components = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset().toString(),
      screen.width.toString(),
      screen.height.toString(),
      screen.colorDepth.toString(),
      navigator.hardwareConcurrency?.toString() || '0',
      // Ajouter un identifiant persistant stocké localement
      this.getOrCreateDeviceId()
    ];
    
    const combined = components.join('|');
    const encoded = new TextEncoder().encode(combined);
    const hash = await crypto.subtle.digest('SHA-256', encoded);
    
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Obtenir ou créer un ID unique pour cet appareil
   */
  private getOrCreateDeviceId(): string {
    const storageKey = 'orion_device_id';
    
    try {
      let deviceId = localStorage.getItem(storageKey);
      
      if (!deviceId) {
        // Générer un nouvel ID
        deviceId = this.generateRandomId();
        localStorage.setItem(storageKey, deviceId);
      }
      
      return deviceId;
    } catch (error) {
      // Fallback si localStorage n'est pas disponible
      logger.warn('SecureStorage', 'localStorage non disponible, utilisation ID temporaire');
      return this.generateRandomId();
    }
  }

  /**
   * Générer un ID aléatoire
   */
  private generateRandomId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Convertir ArrayBuffer en base64
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  /**
   * Convertir base64 en ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Réinitialiser l'encryption (nouveau device/session)
   */
  async reset(): Promise<void> {
    this.encryptionKey = null;
    this.initialized = false;
    
    try {
      localStorage.removeItem('orion_device_id');
      logger.info('SecureStorage', 'Encryption réinitialisée');
    } catch (error) {
      logger.warn('SecureStorage', 'Erreur reset encryption', error);
    }
  }
}

/**
 * Instance globale du système d'encryption
 */
export const secureStorage = new SecureStorage();

/**
 * Helper pour chiffrer des données sensibles avant stockage
 */
export async function encryptSensitiveData(data: unknown): Promise<string> {
  return secureStorage.encrypt(data);
}

/**
 * Helper pour déchiffrer des données
 */
export async function decryptSensitiveData(encryptedData: string): Promise<unknown> {
  return secureStorage.decrypt(encryptedData);
}

/**
 * Vérifier si l'encryption est supportée par le navigateur
 */
export function isEncryptionSupported(): boolean {
  return secureStorage.isSupported();
}

/**
 * Générer un hash sécurisé
 */
export async function secureHash(data: string): Promise<string> {
  return secureStorage.hash(data);
}

/**
 * Générer un token sécurisé
 */
export function generateSecureToken(length?: number): string {
  return secureStorage.generateToken(length);
}
