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

  private checkPermission(permission: 'r2Read' | 'r2Write'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.plugin) {
        reject(new Error(`Plugin '${this.pluginId}' not found.`));
      }

      const hasPermission = this.plugin!.permissions[permission];

      if (!hasPermission) {
        reject(new Error(`Plugin '${this.pluginId}' does not have the required '${permission}' permission.`));
      }

      resolve();
    });
  }

  // Read operations
  async get(key: string, options?: R2GetOptions): Promise<R2Object | R2ObjectBody | null> {
    await this.checkPermission('r2Read');
    return this.r2.get(key, options);
  }

  async head(key: string): Promise<R2Object | null> {
    await this.checkPermission('r2Read');
    return this.r2.head(key);
  }

  async list(options?: R2ListOptions): Promise<R2Objects> {
    await this.checkPermission('r2Read');
    return this.r2.list(options);
  }

  // Write operations
  async put(key: string, value: R2PutValue, options?: R2PutOptions): Promise<R2Object> {
    await this.checkPermission('r2Write');
    return this.r2.put(key, value, options);
  }

  async createMultipartUpload(key: string, options?: R2MultipartOptions): Promise<R2MultipartUpload> {
    await this.checkPermission('r2Write');
    return this.r2.createMultipartUpload(key, options);
  }

  async resumeMultipartUpload(key: string, uploadId: string): Promise<R2MultipartUpload> {
    await this.checkPermission('r2Write');
    return this.r2.resumeMultipartUpload(key, uploadId);
  }

  async delete(keys: string | string[]): Promise<void> {
    await this.checkPermission('r2Write');
    return this.r2.delete(keys);
  }
}
