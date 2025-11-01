// src/api-types.ts
export interface PluginManifest {
  name: string;
  version: string;
  author: string;
  main: string;
  permissions: {
    d1Read: boolean;
    d1Write: boolean;
    r2Read: boolean;
    r2Write: boolean;
    externalFetch: boolean;
  };
}

export interface Plugin extends PluginManifest {
  id: string;
  status: 'active' | 'inactive' | 'pending';
}
