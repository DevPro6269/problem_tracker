import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodType } from 'zod';

const validateBody =
  <T>(schema: ZodType<T>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: {
          message: 'Invalid request body',
          status: 400,
          details: result.error.issues,
        },
      });
      return;
    }
    req.body = result.data;
    next();
  };

export default validateBody;
