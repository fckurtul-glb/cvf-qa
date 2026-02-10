import type { FastifyInstance } from 'fastify';
import { authRoutes } from './modules/auth/routes';
import { userRoutes } from './modules/users/routes';
import { orgRoutes } from './modules/organizations/routes';
import { campaignRoutes } from './modules/campaigns/routes';
import { surveyRoutes } from './modules/survey/routes';
import { reportRoutes } from './modules/reports/routes';
import { analyticsRoutes } from './modules/analytics/routes';

export async function registerRoutes(app: FastifyInstance) {
  app.register(authRoutes, { prefix: '/auth' });
  app.register(userRoutes, { prefix: '/orgs/:orgId/users' });
  app.register(orgRoutes, { prefix: '/orgs' });
  app.register(campaignRoutes, { prefix: '/campaigns' });
  app.register(surveyRoutes, { prefix: '/survey' });
  app.register(reportRoutes, { prefix: '/reports' });
  app.register(analyticsRoutes, { prefix: '/analytics' });
}
