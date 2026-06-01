import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { config } from './config/env.js';
import apiRoutes from './routes/index.js';
import notFound from './middleware/notFound.middleware.js';
import errorHandler from './middleware/error.middleware.js';

const app = express();

function isAllowedOrigin(origin: string): boolean {
  return config.corsOrigins.some((allowed) => {
    if (allowed === origin) return true;
    if (!allowed.includes('*')) return false;

    const pattern = new RegExp(
      `^${allowed
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replaceAll('*', '.*')}$`,
    );
    return pattern.test(origin);
  });
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
  }),
);
app.use(express.json());
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
