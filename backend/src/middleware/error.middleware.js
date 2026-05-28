import { config } from '../config/env.js';

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = Number.isInteger(err.status) ? err.status : 500;
  const message = err.message || 'Internal Server Error';

  const body = {
    error: {
      message,
      status,
    },
  };

  if (!config.isProduction && err.stack) {
    body.error.stack = err.stack;
  }

  res.status(status).json(body);
};

export default errorHandler;
