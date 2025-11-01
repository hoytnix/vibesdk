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

describe('PluginRegistry', () => {
  beforeEach(() => {
    // @ts-ignore
    PluginRegistry.hooks.clear();
    // @ts-ignore
    PluginRegistry.hookTypes.clear();
    // @ts-ignore
    PluginRegistry.plugins.clear();
    vi.clearAllMocks();
    PluginRegistry.initialize(mockDb, mockDb, mockPluginCodeFs);
  });

  describe('addHook', () => {
    it('should register a new hook', () => {
      PluginRegistry.addHook('new-hook', 'Filter');
      expect(PluginRegistry.getHook('new-hook')).toEqual([]);
      // @ts-ignore
      expect(PluginRegistry.hookTypes.get('new-hook')).toBe('Filter');
    });

    it('should throw an error if the hook is already registered', () => {
      PluginRegistry.addHook('existing-hook', 'Action');
      expect(() => PluginRegistry.addHook('existing-hook', 'Action')).toThrow('Hook existing-hook is already registered.');
    });
  });

  describe('registerHookCallback', () => {
    const pluginId = 'test-plugin';

    beforeEach(() => {
      // @ts-ignore
      PluginRegistry.plugins.set(pluginId, {
        id: pluginId,
        permissions: { d1Read: true, d1Write: true, r2Read: true, externalFetch: true },
      });
    });

    it('should register a callback for an existing hook', () => {
      const callback = () => {};
      PluginRegistry.addHook('existing-hook', 'Filter');
      PluginRegistry.registerHookCallback('existing-hook', callback, pluginId);
      expect(PluginRegistry.getHook('existing-hook')).toEqual([{ callback, pluginId }]);
    });

    it('should create a new hook and register a callback if the hook does not exist', () => {
      const callback = () => {};
      PluginRegistry.registerHookCallback('new-hook', callback, pluginId);
      expect(PluginRegistry.getHook('new-hook')).toEqual([{ callback, pluginId }]);
    });
  });

  describe('executeHook', () => {
    describe('Filter Hooks', () => {
      const pluginId = 'test-plugin';
      it('should execute a single callback and transform the data', async () => {
        PluginRegistry.addHook('transform-data', 'Filter');
        const callback = (data: string) => data + ' - modified';
        PluginRegistry.registerHookCallback('transform-data', callback, pluginId);
        const result = await PluginRegistry.executeHook('transform-data', 'initial');
        expect(result).toBe('initial - modified');
      });

      it('should execute multiple callbacks in order', async () => {
        PluginRegistry.addHook('math-operation', 'Filter');
        const callback1 = (data: number) => data * 2;
        const callback2 = (data: number) => data + 5;
        PluginRegistry.registerHookCallback('math-operation', callback1, pluginId);
        PluginRegistry.registerHookCallback('math-operation', callback2, pluginId);
        const result = await PluginRegistry.executeHook('math-operation', 10);
        expect(result).toBe(25);
      });
    });

    describe('Action Hooks', () => {
      const pluginId = 'test-plugin';
      it('should execute callbacks without transforming the data', async () => {
        PluginRegistry.addHook('action-hook', 'Action');
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        PluginRegistry.registerHookCallback('action-hook', callback1, pluginId);
        PluginRegistry.registerHookCallback('action-hook', callback2, pluginId);
        const result = await PluginRegistry.executeHook('action-hook', 'initial');
        expect(result).toBe('initial');
        expect(callback1).toHaveBeenCalledWith('initial', expect.any(Object));
        expect(callback2).toHaveBeenCalledWith('initial', expect.any(Object));
      });
    });

    it('should return the initial data if the hook does not exist', async () => {
      const result = await PluginRegistry.executeHook('non-existent-hook', 'initial');
      expect(result).toBe('initial');
    });
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
      globalThis.PluginRegistry.registerHookCallback('onAgentRequestStart', (prompt) => prompt + ' - modified');
    `;
    const mockR2Object = {
      text: vi.fn().mockResolvedValue(pluginCode),
    };

    // @ts-ignore
    (mockPluginCodeFs.get as vi.Mock).mockResolvedValue(mockR2Object);

    // Mock globalThis.PluginRegistry for the dynamic import
    // @ts-ignore
    globalThis.PluginRegistry = {
      ...PluginRegistry,
      registerHookCallback: (hookName: string, callback: Function) => {
        PluginRegistry.registerHookCallback(hookName, callback, pluginId);
      },
    };

    await PluginRegistry.activate(pluginId);

    expect(mockPluginCodeFs.get).toHaveBeenCalledWith('sample-plugin/main.js');

    const prompt = 'hello';
    const result = await PluginRegistry.executeHook('onAgentRequestStart', prompt);
    expect(result).toBe('hello - modified');
  });

  describe('activate and deactivate', () => {
    const pluginId = 'lifecycle-plugin';
    const plugin = {
      id: pluginId,
      name: 'Lifecycle Plugin',
      version: '1.0.0',
      main: 'main.js',
      status: 'inactive',
      permissions: { d1Read: true, d1Write: false, r2Read: true, externalFetch: false },
    };

    beforeEach(() => {
      // @ts-ignore
      PluginRegistry.plugins.set(pluginId, plugin);
      const mockR2Object = { text: vi.fn().mockResolvedValue('// empty') };
      // @ts-ignore
      (mockPluginCodeFs.get as vi.Mock).mockResolvedValue(mockR2Object);
    });

    it('should call the onActivate hook when a plugin is activated', async () => {
      const onActivateCallback = vi.fn();
      PluginRegistry.registerHookCallback('onActivate', onActivateCallback, pluginId);
      await PluginRegistry.activate(pluginId);
      expect(onActivateCallback).toHaveBeenCalledWith(pluginId, expect.any(Object));
    });

    it('should call the onDeactivate hook when a plugin is deactivated', async () => {
      const onDeactivateCallback = vi.fn();
      PluginRegistry.registerHookCallback('onDeactivate', onDeactivateCallback, pluginId);
      await PluginRegistry.deactivate(pluginId);
      expect(onDeactivateCallback).toHaveBeenCalledWith(pluginId, expect.any(Object));
    });
  });
});
