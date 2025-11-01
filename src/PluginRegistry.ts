// src/PluginRegistry.ts
import { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { Plugin, PluginManifest } from './api-types';
import { SandboxedD1 } from './SandboxedD1';
import { SandboxedR2 } from './SandboxedR2';

class PluginRegistry {
  private static instance: PluginRegistry;
  private hooks: Map<string, { callback: Function; pluginId: string }[]> = new Map();
  private hookTypes: Map<string, 'Action' | 'Filter'> = new Map();
  private plugins: Map<string, Plugin> = new Map();
  private db!: D1Database;
  private pluginErrorLog!: D1Database;
  private pluginCodeFs!: R2Bucket;

  private readonly hookPermissions: Record<string, keyof PluginManifest['permissions']> = {
    'database:read': 'd1Read',
    'database:write': 'd1Write',
    'filesystem:read': 'r2Read',
    'filesystem:write': 'r2Write',
    'network:request': 'externalFetch',
    'beforeDatabaseQueryExecute': 'd1Read', // or d1Write, permission checked dynamically
    'afterDatabaseQueryExecute': 'd1Read', // or d1Write, permission checked dynamically
    'onR2FileUploaded': 'r2Write',
    'beforeOutboundFetch': 'externalFetch',
  };

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

    // Register the built-in lifecycle hooks
    this.addHook('onActivate', 'Action');
    this.addHook('onDeactivate', 'Action');
    this.addHook('onInstall', 'Action');
    this.addHook('onUninstall', 'Action');

    // Register the AI Agent lifecycle hooks
    this.addHook('onAgentRequestStart', 'Filter');
    this.addHook('onGenerationPhaseStart', 'Filter');
    this.addHook('onCodeBlockGenerated', 'Filter');
    this.addHook('onAgentError', 'Filter');
    this.addHook('onGenerationComplete', 'Action');

    // Register the advanced data and resource hooks
    this.addHook('beforeDatabaseQueryExecute', 'Filter');
    this.addHook('afterDatabaseQueryExecute', 'Action');
    this.addHook('onR2FileUploaded', 'Action');
    this.addHook('beforeOutboundFetch', 'Filter');
  }

  public addHook(hookName: string, type: 'Action' | 'Filter'): void {
    if (this.hooks.has(hookName)) {
      throw new Error(`Hook ${hookName} is already registered.`);
    }
    this.hooks.set(hookName, []);
    this.hookTypes.set(hookName, type);
  }

  public registerHookCallback(hookName: string, callback: Function, pluginId: string): void {
    if (!this.hooks.has(hookName)) {
      // Automatically register the hook if it doesn't exist.
      this.hooks.set(hookName, []);
    }
    this.hooks.get(hookName)!.push({ callback, pluginId });
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

  public getHook(hookName: string): { callback: Function; pluginId: string }[] {
    return this.hooks.get(hookName) || [];
  }

  public getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  public async executeHook(hookName: string, initialData: any, ...additionalArgs: any[]): Promise<any> {
    const callbacks = this.getHook(hookName);
    const hookType = this.hookTypes.get(hookName);
    const requiredPermission = this.hookPermissions[hookName];

    if (hookType === 'Action') {
      for (const { callback, pluginId } of callbacks) {
        if (this.hasPermission(pluginId, requiredPermission)) {
          try {
            const sandboxedD1 = new SandboxedD1(this.db, pluginId, this);
            const sandboxedR2 = new SandboxedR2(this.pluginCodeFs, pluginId, this);
            await callback(initialData, { d1: sandboxedD1, r2: sandboxedR2 }, ...additionalArgs);
          } catch (error: any) {
            console.error(`Error executing Action hook ${hookName}:`, error);
            await this.pluginErrorLog.prepare('INSERT INTO PluginErrorLog (plugin_id, error_message, stack_trace) VALUES (?, ?, ?)')
              .bind(pluginId, error.message, error.stack)
              .run();
          }
        }
      }
      return initialData;
    }

    // Default to 'Filter' behavior
    let data = initialData;
    for (const { callback, pluginId } of callbacks) {
      if (this.hasPermission(pluginId, requiredPermission)) {
        try {
          const sandboxedD1 = new SandboxedD1(this.db, pluginId, this);
          const sandboxedR2 = new SandboxedR2(this.pluginCodeFs, pluginId, this);
          const result = await callback(data, { d1: sandboxedD1, r2: sandboxedR2 }, ...additionalArgs);
          if (result !== undefined) {
            data = result;
          }
        } catch (error: any) {
          console.error(`Error executing Filter hook ${hookName}:`, error);
          await this.pluginErrorLog.prepare('INSERT INTO PluginErrorLog (plugin_id, error_message, stack_trace) VALUES (?, ?, ?)')
            .bind(pluginId, error.message, error.stack)
            .run();
        }
      }
    }

    return data;
  }

  public hasPermission(pluginId: string, permission: keyof PluginManifest['permissions']): boolean {
    if (!permission) {
      // No permission required for this hook
      return true;
    }

    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      // Plugin not found
      return false;
    }

    return plugin.permissions[permission];
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

          // Execute the onActivate hook
          await this.executeHook('onActivate', plugin.id);
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

      // Execute the onDeactivate hook
      await this.executeHook('onDeactivate', pluginId);
    }
  }
}

export default PluginRegistry.getInstance();
