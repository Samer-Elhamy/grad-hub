import { Router, type Request, type Response } from 'express';

const router = Router();

/**
 * GET /api/health
 * Health check endpoint for monitoring and load balancer probes.
 * Returns server status and current timestamp.
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
