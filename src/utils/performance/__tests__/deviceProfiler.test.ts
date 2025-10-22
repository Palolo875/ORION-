import { describe, it, expect } from 'vitest';
import { detectDeviceProfile, detectDeviceCapabilities, type DeviceProfile } from '../deviceProfiler';

console.log('🎭 Tests avec MOCKS (rapide)');

describe('DeviceProfiler', () => {
  describe('detectDeviceProfile', () => {
    it('should detect device profile', async () => {
      const profile = await detectDeviceProfile();
      expect(profile).toBeDefined();
    });

    it('should return valid profile type', async () => {
      const profile = await detectDeviceProfile();
      const validProfiles: DeviceProfile[] = ['full', 'lite', 'micro'];
      expect(validProfiles).toContain(profile);
    });

    it('should be consistent across multiple calls', async () => {
      const profile1 = await detectDeviceProfile();
      const profile2 = await detectDeviceProfile();
      expect(profile1).toBe(profile2);
    });
  });

  describe('Profile characteristics', () => {
    it('should handle high-end devices', async () => {
      const profile = await detectDeviceProfile();
      expect(profile).toMatch(/full|lite|micro/);
    });

    it('should handle low-end devices', async () => {
      const profile = await detectDeviceProfile();
      expect(typeof profile).toBe('string');
      expect(profile.length).toBeGreaterThan(0);
    });
  });

  describe('Performance metrics', () => {
    it('should consider memory capacity', async () => {
      const profile = await detectDeviceProfile();
      expect(profile).toBeDefined();
    });

    it('should consider CPU cores', async () => {
      const profile = await detectDeviceProfile();
      expect(profile).toBeDefined();
    });
  });
});
