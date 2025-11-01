// worker/api/routes/templateRoutes.ts
import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import ProjectTemplateRegistry from '../../services/templates/templateRegistry';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

export function setupTemplateRoutes(app: Hono<AppEnv>): void {
  const templateRouter = new Hono<AppEnv>();

  templateRouter.get(
    '/',
    setAuthLevel(AuthConfig.public),
    (c) => {
      const templates = ProjectTemplateRegistry.getTemplates();
      return c.json({ success: true, templates });
    }
  );

  app.route('/api/templates', templateRouter);
}
