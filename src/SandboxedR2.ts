// src/SandboxedR2.ts
import { R2Bucket, R2Object, R2ObjectBody, R2Objects } from '@cloudflare/workers-types';
import PluginRegistry from './PluginRegistry';
import { Plugin } from './api-types';

export class SandboxedR2 implements R2Bucket {
  private plugin?: Plugin;

  constructor(
    private r2: R2Bucket,
    private pluginId: string,
    private registry: PluginRegistry,
  ) {
    this.plugin = this.registry.getPlugin(this.pluginId);
  }

  private checkPermission(permission: 'r2Read' | 'r2Write'): void {
    if (!this.plugin) {
      throw new Error(`Plugin '${this.pluginId}' not found.`);
    }

    // A simple mapping for now. In the future, this could be more granular.
    const hasPermission = permission === 'r2Read' ? this.plugin.permissions.r2Read : this.plugin.permissions.r2Write;

    if (!hasPermission) {
      throw new Error(`Plugin '${this.pluginId}' does not have the required '${permission}' permission.`);
    }
  }

  // Read operations
  async get(key: string, options?: R2GetOptions): Promise<R2Object | R2ObjectBody | null> {
    this.checkPermission('r2Read');
    return this.r2.get(key, options);
  }

  async head(key: string): Promise<R2Object | null> {
    this.checkPermission('r2Read');
    return this.r2.head(key);
  }

  async list(options?: R2ListOptions): Promise<R2Objects> {
    this.checkPermission('r2Read');
    return this.r2.list(options);
  }

  // Write operations
  async put(key: string, value: R2PutValue, options?: R2PutOptions): Promise<R2Object> {
    this.checkPermission('r2Write');
    return this.r2.put(key, value, options);
  }

  async createMultipartUpload(key: string, options?: R2MultipartOptions): Promise<R2MultipartUpload> {
    this.checkPermission('r2Write');
    return this.r2.createMultipartUpload(key, options);
  }

  async resumeMultipartUpload(key: string, uploadId: string): Promise<R2MultipartUpload> {
    this.checkPermission('r2Write');
    return this.r2.resumeMultipartUpload(key, uploadId);
  }

  async delete(keys: string | string[]): Promise<void> {
    this.checkPermission('r2Write');
    return this.r2.delete(keys);
  }
}
