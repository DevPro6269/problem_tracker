import type { Request, Response, NextFunction } from 'express';

const notFound = (req: Request, res: Response, _next: NextFunction): void => {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      status: 404,
    },
  });
};

export default notFound;
