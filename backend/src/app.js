import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { config } from './config/env.js';
import apiRoutes from './routes/index.js';
import notFound from './middleware/notFound.middleware.js';
import errorHandler from './middleware/error.middleware.js';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
