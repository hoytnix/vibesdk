// src/PluginRegistry.ts
import * as hooks from './hooks';
import { D1Database, R2Bucket } from '@cloudflare/workers-types';

type HookName = keyof typeof hooks;

interface PluginManifest {
  name: string;
  version: string;
  author: string;
  main: string;
  permissions: {
    d1Read: boolean;
    d1Write: boolean;
    r2Read: boolean;
    externalFetch: boolean;
  };
}

interface Plugin extends PluginManifest {
  id: string;
  status: 'active' | 'inactive' | 'pending';
}

class PluginRegistry {
  private static instance: PluginRegistry;
  private hooks: Map<HookName, Function[]> = new Map();
  private plugins: Map<string, Plugin> = new Map();
  private db!: D1Database;
  private pluginErrorLog!: D1Database;
  private pluginCodeFs!: R2Bucket;

  private constructor() {}

  public static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  public initialize(db: D1Database, pluginErrorLog: D1Database, pluginCodeFs: R2Bucket) {
    this.db = db;
    this.pluginErrorLog = pluginErrorLog;
    this.pluginCodeFs = pluginCodeFs;
  }

  public addHook(hookName: HookName, callback: Function): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    this.hooks.get(hookName)!.push(callback);
  }

  public async register(pluginPath: string): Promise<void> {
    const manifestObject = await this.pluginCodeFs.get(`${pluginPath}/plugin.json`);
    if (!manifestObject) {
      throw new Error(`Plugin manifest not found at ${pluginPath}/plugin.json`);
    }

    const manifest: PluginManifest = JSON.parse(await manifestObject.text());

    // Capability check
    if (!manifest.permissions) {
      throw new Error(`Plugin ${manifest.name} is missing permissions in its manifest.`);
    }

    const pluginId = manifest.name.toLowerCase().replace(/\\s+/g, '-');
    const plugin: Plugin = { ...manifest, id: pluginId, status: 'inactive' };

    await this.db.prepare('INSERT INTO PluginRegistry (id, name, version, status, permissions) VALUES (?, ?, ?, ?, ?)')
      .bind(plugin.id, plugin.name, plugin.version, plugin.status, JSON.stringify(plugin.permissions))
      .run();

    this.plugins.set(plugin.id, plugin);
    console.log(`Plugin ${plugin.name} registered.`);
  }

  public getHook(hookName: HookName): Function[] {
    return this.hooks.get(hookName) || [];
  }

  public async executeHook(hookName: HookName, initialData: any, ...additionalArgs: any[]): Promise<any> {
    const callbacks = this.getHook(hookName);
    let data = initialData;

    for (const callback of callbacks) {
      try {
        const result = await callback(data, ...additionalArgs);
        if (result !== undefined) {
          data = result;
        }
      } catch (error: any) {
        console.error(`Error executing hook ${hookName}:`, error);
        await this.pluginErrorLog.prepare('INSERT INTO PluginErrorLog (plugin_id, error_message, stack_trace) VALUES (?, ?, ?)')
          .bind('unknown', error.message, error.stack)
          .run();
      }
    }

    return data;
  }

  public async activate(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      await this.db.prepare('UPDATE PluginRegistry SET status = ? WHERE id = ?')
        .bind('active', pluginId)
        .run();
      plugin.status = 'active';

      // Dynamically import the plugin's main file from R2
      // This is a simplified representation. In a real scenario, you'd need a more
      // robust way to handle this, potentially with a custom module loader.
      const pluginCode = await this.pluginCodeFs.get(`${plugin.name}/${plugin.main}`);
      if (pluginCode) {
        // This is a conceptual example. Direct execution of code from R2 in a worker
        // would require more complex handling, like using `eval` (not recommended)
        // or a sandboxed environment.
        console.log(`Plugin ${plugin.name} activated.`);
      }
    }
  }

  public async deactivate(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      await this.db.prepare('UPDATE PluginRegistry SET status = ? WHERE id = ?')
        .bind('inactive', pluginId)
        .run();
      plugin.status = 'inactive';
      console.log(`Plugin ${plugin.name} deactivated.`);
    }
  }
}

export default PluginRegistry.getInstance();
