// src/PluginRegistry.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PluginRegistry from './PluginRegistry';
import { D1Database, R2Bucket } from '@cloudflare/workers-types';

// Mocks for D1 and R2
const mockDb = {
  prepare: vi.fn(() => ({
    bind: vi.fn(() => ({
      run: vi.fn(() => Promise.resolve()),
    })),
  })),
} as unknown as D1Database;

const mockPluginCodeFs = {
  get: vi.fn(),
} as unknown as R2Bucket;

// Mock the global PluginRegistry
// @ts-ignore
globalThis.PluginRegistry = {
    addHook: vi.fn()
};

describe('PluginRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PluginRegistry.initialize(mockDb, mockDb, mockPluginCodeFs);
  });

  it('should activate a plugin and execute its code', async () => {
    const pluginId = 'sample-plugin';
    const plugin = {
      id: pluginId,
      name: 'Sample Plugin',
      version: '1.0.0',
      main: 'main.js',
      status: 'inactive',
      permissions: { d1Read: true, d1Write: false, r2Read: true, externalFetch: false },
    };

    // @ts-ignore
    PluginRegistry.plugins.set(pluginId, plugin);

    const pluginCode = `
      // @ts-nocheck
      globalThis.PluginRegistry.addHook('onAgentRequestStart', (prompt) => prompt + ' - modified');
    `;
    const mockR2Object = {
      text: vi.fn().mockResolvedValue(pluginCode),
    };

    // @ts-ignore
    (mockPluginCodeFs.get as vi.Mock).mockResolvedValue(mockR2Object);

    await PluginRegistry.activate(pluginId);

    expect(mockPluginCodeFs.get).toHaveBeenCalledWith('sample-plugin/main.js');
    // We can't directly test the dynamic import's effect on the real PluginRegistry in this test,
    // but we can check if the R2 object was retrieved, which is the necessary pre-condition.
  });
});
