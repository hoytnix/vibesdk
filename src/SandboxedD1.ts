// src/SandboxedD1.ts
import { D1Database, D1PreparedStatement, D1Result } from '@cloudflare/workers-types';
import PluginRegistry from './PluginRegistry';

export class SandboxedD1 implements D1Database {
    private readonly db: D1Database;
    private readonly pluginId: string;
    private readonly pluginRegistry: PluginRegistry;

    constructor(db: D1Database, pluginId: string, pluginRegistry: PluginRegistry) {
        this.db = db;
        this.pluginId = pluginId;
        this.pluginRegistry = pluginRegistry;
    }

    private hasPermission(permission: 'd1Read' | 'd1Write'): boolean {
        return this.pluginRegistry.hasPermission(this.pluginId, permission);
    }

    private checkPermission(query: string): void {
        const isWriteQuery = /^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)\s/i.test(query);
        const requiredPermission = isWriteQuery ? 'd1Write' : 'd1Read';
        if (!this.hasPermission(requiredPermission)) {
            throw new Error(`Plugin '${this.pluginId}' does not have the required '${requiredPermission}' permission.`);
        }
    }

    async exec(query: string): Promise<D1Result> {
        this.checkPermission(query);
        const modifiedQuery = await this.pluginRegistry.executeHook('beforeDatabaseQueryExecute', { query, pluginId: this.pluginId });
        const result = await this.db.exec(modifiedQuery);
        await this.pluginRegistry.executeHook('afterDatabaseQueryExecute', { query: modifiedQuery, result, pluginId: this.pluginId });
        return result;
    }

    async dump(): Promise<ArrayBuffer> {
        if (!this.hasPermission('d1Read')) {
            throw new Error(`Plugin '${this.pluginId}' does not have the required 'd1Read' permission.`);
        }
        return await this.db.dump();
    }

    prepare(query: string): D1PreparedStatement {
        this.checkPermission(query);
        const originalStatement = this.db.prepare(query);
        const sandboxedStatement: any = {};

        const methods: (keyof D1PreparedStatement)[] = ['bind', 'first', 'run', 'all', 'raw'];

        for (const method of methods) {
            if (typeof originalStatement[method] === 'function') {
                sandboxedStatement[method] = (...args: any[]) => {
                    this.checkPermission(query);
                    return (originalStatement as any)[method](...args);
                };
            }
        }

        return sandboxedStatement as D1PreparedStatement;
    }

    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
        for (const statement of statements) {
            // D1PreparedStatement doesn't expose the query, so we can't check permissions here.
            // This is a limitation of the current API. We will assume the user has the correct permissions.
        }
        return this.db.batch<T>(statements);
    }
}
