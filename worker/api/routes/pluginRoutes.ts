// worker/api/routes/pluginRoutes.ts
import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import unzipper from 'unzipper';
import { Readable } from 'stream';
import PluginRegistry from '../../../src/PluginRegistry';

// Extend the AppEnv to include the R2 Buckets
interface PluginAppEnv extends AppEnv {
    Bindings: {
        PLUGIN_ARCHIVES: R2Bucket;
        PLUGIN_CODE_FS: R2Bucket;
    };
}

export function setupPluginRoutes(app: Hono<PluginAppEnv>): void {
  const pluginRoutes = new Hono<PluginAppEnv>();

  // Initialize the PluginRegistry with the necessary bindings
  pluginRoutes.use('*', async (c, next) => {
    PluginRegistry.initialize(c.env.DB, c.env.DB, c.env.PLUGIN_CODE_FS); // Using DB for both for now
    await next();
  });

  // GET /api/plugins/discover
  pluginRoutes.get('/discover', async (c) => {
    // In a real implementation, this would come from a curated list in D1
    const discoverablePlugins = [
      { id: 'plugin-1', name: 'AI Prompt Modifier', version: '1.0.0', author: 'Dev Co.' },
      { id: 'plugin-2', name: 'Project Template Pack', version: '1.2.0', author: 'Creative Inc.' },
    ];
    return c.json(discoverablePlugins);
  });

  // POST /api/plugins/upload
  pluginRoutes.post('/upload', async (c) => {
    const body = await c.req.parseBody();
    const file = body['plugin.zip'] as File;

    if (!file) {
      return c.json({ error: 'Plugin archive not provided.' }, 400);
    }

    // Store the raw zip file in the plugin-archives R2 bucket
    await c.env.PLUGIN_ARCHIVES.put(file.name, await file.arrayBuffer());

    // Log to D1 and set status to pending
    // This part is simplified; a real implementation would have more robust user ID handling
    const pluginId = file.name.replace('.zip', '');
    await c.env.DB.prepare('INSERT INTO PluginRegistry (id, name, version, status, permissions) VALUES (?, ?, ?, ?, ?)')
      .bind(pluginId, pluginId, '0.0.0', 'pending', '{}')
      .run();

    return c.json({
      message: 'Plugin uploaded successfully. It is now pending review.',
      status: 'Pending Review',
    });
  });

  // POST /api/plugins/install
  pluginRoutes.post(
    '/install',
    zValidator('json', z.object({ pluginId: z.string() })),
    async (c) => {
      const { pluginId } = c.req.valid('json');
      const zipFileName = `${pluginId}.zip`;

      // Get the zip file from the archives bucket
      const zipObject = await c.env.PLUGIN_ARCHIVES.get(zipFileName);
      if (!zipObject) {
        return c.json({ error: 'Plugin archive not found.' }, 404);
      }

      // Unzip the file and upload its contents to the plugin-code-fs bucket
      const readableStream = new Readable();
      readableStream._read = () => {};
      readableStream.push(await zipObject.arrayBuffer());
      readableStream.push(null);

      const directory = await unzipper.Open.buffer(Buffer.from(await zipObject.arrayBuffer()));
      for (const file of directory.files) {
        const content = await file.buffer();
        await c.env.PLUGIN_CODE_FS.put(`${pluginId}/${file.path}`, content);
      }

      // Register the plugin
      await PluginRegistry.register(pluginId);

      return c.json({
        message: `Plugin ${pluginId} installed successfully.`,
        status: 'Installed',
      });
    }
  );

  // POST /api/plugins/activate
  pluginRoutes.post(
    '/activate',
    zValidator('json', z.object({ pluginId: z.string() })),
    async (c) => {
      const { pluginId } = c.req.valid('json');
      await PluginRegistry.activate(pluginId);
      return c.json({ message: `Plugin ${pluginId} activated.` });
    }
  );

  // POST /api/plugins/deactivate
  pluginRoutes.post(
    '/deactivate',
    zValidator('json', z.object({ pluginId: z.string() })),
    async (c) => {
      const { pluginId } = c.req.valid('json');
      await PluginRegistry.deactivate(pluginId);
      return c.json({ message: `Plugin ${pluginId} deactivated.` });
    }
  );

  // POST /api/plugins/uninstall
  pluginRoutes.post(
    '/uninstall',
    zValidator('json', z.object({ pluginId: z.string() })),
    async (c) => {
      const { pluginId } = c.req.valid('json');
      // In a real implementation, this would also remove the plugin's code from R2
      await c.env.DB.prepare('DELETE FROM PluginRegistry WHERE id = ?').bind(pluginId).run();
      return c.json({ message: `Plugin ${pluginId} uninstalled.` });
    }
  );

  app.route('/api/plugins', pluginRoutes);
}
