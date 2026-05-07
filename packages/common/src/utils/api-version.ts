import { Request } from 'express';

export function extractApiVersion(req: Request): string | undefined {
  const url = req.url || '';
  const m = url.match(/\/v(\d+)(?:\/|$)/);
  return m ? `v${m[1]}` : undefined;
}
