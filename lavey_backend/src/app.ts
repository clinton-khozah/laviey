import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { swaggerSpec } from './docs/swagger.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { apiRoutes } from './routes/index.js';

export function createApp() {
  const app = express();
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((value) => value.trim());

  app.use(helmet({ contentSecurityPolicy: false, crossOriginOpenerPolicy: false }));
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        if (env.NODE_ENV === 'development' && /^http:\/\/localhost:\d+$/.test(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  app.use(`${env.API_PREFIX}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get(`${env.API_PREFIX}/docs.json`, (_req, res) => {
    res.json(swaggerSpec);
  });

  app.use(env.API_PREFIX, apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
