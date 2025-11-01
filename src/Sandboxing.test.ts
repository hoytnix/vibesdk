// src/Sandboxing.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PluginRegistry from './PluginRegistry';
import { SandboxedD1 } from './SandboxedD1';
import { SandboxedR2 } from './SandboxedR2';
import { D1Database, R2Bucket, D1PreparedStatement } from '@cloudflare/workers-types';
import { Plugin } from './api-types';

// Mocks
const mockDb = {
  prepare: vi.fn(() => ({ bind: vi.fn(), first: vi.fn(), all: vi.fn(), run: vi.fn(), raw: vi.fn() })),
  exec: vi.fn(),
  batch: vi.fn(),
  dump: vi.fn(),
} as unknown as D1Database;

const mockR2 = {
  get: vi.fn(),
  put: vi.fn(),
  head: vi.fn(),
  list: vi.fn(),
  delete: vi.fn(),
} as unknown as R2Bucket;

const mockPluginWithAllPermissions: Plugin = {
  id: 'test-plugin-all-perms',
  name: 'Test Plugin All Perms',
  version: '1.0.0',
  author: 'Test Author',
  main: 'index.js',
  status: 'active',
  permissions: {
    d1Read: true,
    d1Write: true,
    r2Read: true,
    r2Write: true,
    externalFetch: true,
  },
};

const mockPluginWithNoPermissions: Plugin = {
  id: 'test-plugin-no-perms',
  name: 'Test Plugin No Perms',
  version: '1.0.0',
  author: 'Test Author',
  main: 'index.js',
  status: 'active',
  permissions: {
    d1Read: false,
    d1Write: false,
    r2Read: false,
    r2Write: false,
    externalFetch: false,
  },
};

describe('Sandboxing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const registryInstance = PluginRegistry as any;
    registryInstance.plugins.set(mockPluginWithAllPermissions.id, mockPluginWithAllPermissions);
    registryInstance.plugins.set(mockPluginWithNoPermissions.id, mockPluginWithNoPermissions);
  });

  describe('SandboxedD1', () => {
    it('should allow read operations with d1Read permission', () => {
      const sandboxedDb = new SandboxedD1(mockDb, mockPluginWithAllPermissions.id, PluginRegistry);
      sandboxedDb.prepare('SELECT * FROM users');
      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM users');
    });

    it('should deny read operations without d1Read permission', () => {
      const sandboxedDb = new SandboxedD1(mockDb, mockPluginWithNoPermissions.id, PluginRegistry);
      expect(() => sandboxedDb.prepare('SELECT * FROM users')).toThrow("Plugin 'test-plugin-no-perms' does not have the required 'd1Read' permission.");
    });

    it('should allow write operations with d1Write permission', () => {
      const sandboxedDb = new SandboxedD1(mockDb, mockPluginWithAllPermissions.id, PluginRegistry);
      sandboxedDb.prepare('INSERT INTO users VALUES (1, "test")');
      expect(mockDb.prepare).toHaveBeenCalledWith('INSERT INTO users VALUES (1, "test")');
    });

    it('should deny write operations without d1Write permission', () => {
      const sandboxedDb = new SandboxedD1(mockDb, mockPluginWithNoPermissions.id, PluginRegistry);
      expect(() => sandboxedDb.prepare('INSERT INTO users VALUES (1, "test")')).toThrow("Plugin 'test-plugin-no-perms' does not have the required 'd1Write' permission.");
    });
  });

  describe('SandboxedR2', () => {
    it('should allow read operations with r2Read permission', async () => {
      const sandboxedR2 = new SandboxedR2(mockR2, mockPluginWithAllPermissions.id, PluginRegistry);
      await sandboxedR2.get('test-key');
      expect(mockR2.get).toHaveBeenCalledWith('test-key');
    });

    it('should deny read operations without r2Read permission', async () => {
      const sandboxedR2 = new SandboxedR2(mockR2, mockPluginWithNoPermissions.id, PluginRegistry);
      await expect(sandboxedR2.get('test-key')).rejects.toThrow("Plugin 'test-plugin-no-perms' does not have the required 'r2Read' permission.");
    });

    it('should allow write operations with r2Write permission', async () => {
      const sandboxedR2 = new SandboxedR2(mockR2, mockPluginWithAllPermissions.id, PluginRegistry);
      await sandboxedR2.put('test-key', 'test-value');
      expect(mockR2.put).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('should deny write operations without r2Write permission', async () => {
        const sandboxedR2 = new SandboxedR2(mockR2, mockPluginWithNoPermissions.id, PluginRegistry);
        await expect(sandboxedR2.put('test-key', 'test-value')).rejects.toThrow("Plugin 'test-plugin-no-perms' does not have the required 'r2Write' permission.");
    });
  });
});
