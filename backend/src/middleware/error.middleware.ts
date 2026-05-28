import type { ErrorRequestHandler } from 'express';
import { config } from '../config/env.js';

interface HttpError extends Error {
  status?: number;
}

const errorHandler: ErrorRequestHandler = (err: HttpError, _req, res, _next) => {
  const status = Number.isInteger(err.status) ? (err.status as number) : 500;
  const message = err.message || 'Internal Server Error';

  const body: {
    error: { message: string; status: number; stack?: string };
  } = {
    error: { message, status },
  };

  if (!config.isProduction && err.stack) {
    body.error.stack = err.stack;
  }

  res.status(status).json(body);
};

export default errorHandler;
