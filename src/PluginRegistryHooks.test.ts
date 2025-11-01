// src/PluginRegistryHooks.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PluginRegistry from './PluginRegistry';
import { D1Database, R2Bucket } from '@cloudflare/workers-types';

// Mock the dependencies
const mockDb = {} as D1Database;
const mockErrorLog = {} as D1Database;
const mockCodeFs = {} as R2Bucket;

describe('PluginRegistry Lifecycle Hooks', () => {
  beforeEach(() => {
    // Reset the singleton instance and its hooks before each test
    const registryInstance = PluginRegistry as any;
    registryInstance.hooks = new Map();
    registryInstance.hookTypes = new Map();
    registryInstance.plugins = new Map();
    PluginRegistry.initialize(mockDb, mockErrorLog, mockCodeFs);
  });

  it('should register onInstall and onUninstall hooks on initialization', () => {
    const registryInstance = PluginRegistry as any;
    expect(registryInstance.hooks.has('onInstall')).toBe(true);
    expect(registryInstance.hookTypes.get('onInstall')).toBe('Action');
    expect(registryInstance.hooks.has('onUninstall')).toBe(true);
    expect(registryInstance.hookTypes.get('onUninstall')).toBe('Action');
  });

  it('should execute onInstall callbacks', async () => {
    const onInstallCallback = vi.fn();
    const pluginId = 'test-plugin-install';

    PluginRegistry.registerHookCallback('onInstall', onInstallCallback, pluginId);
    await PluginRegistry.executeHook('onInstall', pluginId);

    expect(onInstallCallback).toHaveBeenCalledWith(pluginId);
  });

  it('should execute onUninstall callbacks', async () => {
    const onUninstallCallback = vi.fn();
    const pluginId = 'test-plugin-uninstall';

    PluginRegistry.registerHookCallback('onUninstall', onUninstallCallback, pluginId);
    await PluginRegistry.executeHook('onUninstall', pluginId);

    expect(onUninstallCallback).toHaveBeenCalledWith(pluginId);
  });
});
