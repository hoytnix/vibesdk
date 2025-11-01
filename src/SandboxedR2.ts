// src/SandboxedR2.ts
import { R2Bucket, R2Object, R2ObjectBody } from '@cloudflare/workers-types';
import PluginRegistry from './PluginRegistry';

export class SandboxedR2 implements R2Bucket {
    private readonly r2: R2Bucket;
    private readonly pluginId: string;
    private readonly pluginRegistry: PluginRegistry;

    constructor(r2: R2Bucket, pluginId: string, pluginRegistry: PluginRegistry) {
        this.r2 = r2;
        this.pluginId = pluginId;
        this.pluginRegistry = pluginRegistry;
    }

    private hasPermission(permission: 'r2Read' | 'r2Write'): boolean {
        return this.pluginRegistry.hasPermission(this.pluginId, permission);
    }

    async put(key: string, value: any, options?: any): Promise<R2Object> {
        if (!this.hasPermission('r2Write')) {
            return Promise.reject(new Error(`Plugin '${this.pluginId}' does not have the required 'r2Write' permission.`));
        }
        const result = await this.r2.put(key, value, options);
        await this.pluginRegistry.executeHook('onR2FileUploaded', { key, value, options, pluginId: this.pluginId });
        return result;
    }

    async get(key: string, options?: any): Promise<R2ObjectBody | null> {
        if (!this.hasPermission('r2Read')) {
            return Promise.reject(new Error(`Plugin '${this.pluginId}' does not have the required 'r2Read' permission.`));
        }
        return this.r2.get(key, options);
    }

    async delete(keys: string | string[]): Promise<void> {
        if (!this.hasPermission('r2Write')) {
            throw new Error(`Plugin '${this.pluginId}' does not have the required 'r2Write' permission.`);
        }
        return this.r2.delete(keys);
    }

    async list(options?: any): Promise<any> {
        if (!this.hasPermission('r2Read')) {
            throw new Error(`Plugin '${this.pluginId}' does not have the required 'r2Read' permission.`);
        }
        return this.r2.list(options);
    }

    async head(key: string): Promise<R2Object | null> {
        if (!this.hasPermission('r2Read')) {
            throw new Error(`Plugin '${this.pluginId}' does not have the required 'r2Read' permission.`);
        }
        return this.r2.head(key);
    }
}
