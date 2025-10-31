// src/PluginRegistry.ts
import { D1Database, R2Bucket } from '@cloudflare/workers-types';

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
  private hooks: Map<string, Function[]> = new Map();
  private hookTypes: Map<string, 'Action' | 'Filter'> = new Map();
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

  public addHook(hookName: string, type: 'Action' | 'Filter'): void {
    if (this.hooks.has(hookName)) {
      throw new Error(`Hook ${hookName} is already registered.`);
    }
    this.hooks.set(hookName, []);
    this.hookTypes.set(hookName, type);
  }

  public registerHookCallback(hookName: string, callback: Function): void {
    if (!this.hooks.has(hookName)) {
      // Automatically register the hook if it doesn't exist.
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

  public getHook(hookName: string): Function[] {
    return this.hooks.get(hookName) || [];
  }

  public async executeHook(hookName: string, initialData: any, ...additionalArgs: any[]): Promise<any> {
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

      const pluginCodeObject = await this.pluginCodeFs.get(`${pluginId}/${plugin.main}`);
      if (pluginCodeObject) {
        const pluginCode = await pluginCodeObject.text();
        // Using a Data URI with a dynamic import to execute the plugin code
        // This is a more secure alternative to eval() and works with ES modules.
        const encodedCode = Buffer.from(pluginCode).toString('base64');
        const dataUri = `data:text/javascript;base64,${encodedCode}`;

        try {
          // @ts-ignore - This is a dynamic import, and TypeScript may not recognize it.
          await import(/* webpackIgnore: true */ dataUri);
          console.log(`Plugin ${plugin.name} activated and executed.`);
        } catch (error) {
          console.error(`Error activating plugin ${plugin.name}:`, error);
        }
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
