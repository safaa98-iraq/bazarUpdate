import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // AppError — explicit status code
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: err.message });
    return;
  }

  // Plain errors with a `status` property (used throughout routes/services)
  const statusProp = (err as { status?: unknown }).status;
  if (typeof statusProp === 'number' && statusProp >= 400 && statusProp < 600) {
    res.status(statusProp).json({ success: false, error: err.message });
    return;
  }

  // Prisma unique constraint
  if ((err as { code?: string }).code === 'P2002') {
    res.status(409).json({ success: false, error: 'A record with this value already exists' });
    return;
  }

  // Prisma not found
  if ((err as { code?: string }).code === 'P2025') {
    res.status(404).json({ success: false, error: 'Record not found' });
    return;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  console.error('[ERROR]', isProduction ? err.message : err);
  res.status(500).json({ success: false, error: 'Internal server error' });
}
