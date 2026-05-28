import type { Request, Response, NextFunction } from 'express';

const tenantGuard = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: { message: 'Unauthenticated', status: 401 } });
    return;
  }
  const slug = req.params.slug;
  const m = req.user.memberships.find((m) => m.slug === slug);
  if (!m) {
    res.status(403).json({
      error: { message: 'Not a member of this society', status: 403 },
    });
    return;
  }
  req.society = { id: m.societyId, slug: m.slug, role: m.role };
  next();
};

export default tenantGuard;
