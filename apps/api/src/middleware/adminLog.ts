import { Request, Response, NextFunction } from 'express';
import prisma from '@storebuilder/database';
import { AdminActionType } from '@storebuilder/types';

export function logAdminAction(
  action: AdminActionType,
  targetType: string,
  getTargetId: (req: Request) => string,
  getDetails?: (req: Request, res: Response) => Record<string, unknown>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      if (req.user?.role === 'SUPER_ADMIN' && res.statusCode < 400) {
        const storeId =
          (req.body?.storeId as string | undefined) ??
          (req.params?.storeId as string | undefined) ??
          undefined;

        prisma.adminLog
          .create({
            data: {
              adminId: req.user.userId,
              action,
              targetType,
              targetId: getTargetId(req),
              details: (getDetails ? getDetails(req, res) : req.body) as import('@prisma/client').Prisma.InputJsonValue,
              storeId,
            },
          })
          .catch((err) => console.error('AdminLog write failed:', err));
      }
      return originalJson(body);
    };

    next();
  };
}
