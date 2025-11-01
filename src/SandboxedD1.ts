// src/SandboxedD1.ts
import { D1Database, D1PreparedStatement, D1Result, D1ExecResult } from '@cloudflare/workers-types';
import PluginRegistry from './PluginRegistry';
import { Plugin } from './api-types';

class SandboxedD1PreparedStatement implements D1PreparedStatement {
  constructor(private statement: D1PreparedStatement) {}

  bind(...bindings: any[]): D1PreparedStatement {
    return new SandboxedD1PreparedStatement(this.statement.bind(...bindings));
  }
  first<T = unknown>(colName?: string): Promise<T | null> {
    return this.statement.first(colName);
  }
  all<T = unknown>(): Promise<D1Result<T>> {
    return this.statement.all();
  }
  run<T = unknown>(): Promise<D1Result<T>> {
    return this.statement.run();
  }
  raw<T = unknown>(): Promise<T[]> {
    return this.statement.raw();
  }
}

export class SandboxedD1 {
  private plugin?: Plugin;

  constructor(
    private db: D1Database,
    private pluginId: string,
    private registry: PluginRegistry,
  ) {
    this.plugin = this.registry.getPlugin(this.pluginId);
  }

  private getRequiredPermission(sql: string): 'd1Read' | 'd1Write' {
    const query = sql.trim().toUpperCase();
    const writeKeywords = ['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER'];

    if (query.startsWith('SELECT')) {
      return 'd1Read';
    }

    if (writeKeywords.some(keyword => query.startsWith(keyword))) {
      return 'd1Write';
    }

    throw new Error('Unsupported or unrecognized SQL command.');
  }

  private checkPermission(permission: 'd1Read' | 'd1Write'): void {
    if (!this.plugin) {
      throw new Error(`Plugin '${this.pluginId}' not found.`);
    }
    if (!this.plugin.permissions[permission]) {
      throw new Error(`Plugin '${this.pluginId}' does not have the required '${permission}' permission.`);
    }
  }

  prepare(query: string): D1PreparedStatement {
    const permission = this.getRequiredPermission(query);
    this.checkPermission(permission);
    const statement = this.db.prepare(query);
    return new SandboxedD1PreparedStatement(statement);
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    // Note: This simplified check assumes all statements in a batch have the same permission requirement.
    // A more robust implementation would check each statement.
    if (statements.length > 0) {
        // A real implementation would need to parse the private _query property of the statement
        // For now, we assume write permission is needed for batch operations.
        this.checkPermission('d1Write');
    }
    return this.db.batch(statements);
  }

  async exec(query: string): Promise<D1ExecResult> {
    // D1 exec is for multi-statement queries, often used for schema changes or bulk inserts.
    // We'll require d1Write for this.
    this.checkPermission('d1Write');
    return this.db.exec(query);
  }

  async dump(): Promise<ArrayBuffer> {
    this.checkPermission('d1Read');
    return this.db.dump();
  }
}
