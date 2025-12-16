import { Router } from 'express';
import prisma from '../config/prisma';

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'vst-backend',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      database: 'connected',
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'vst-backend',
      error: 'Database connection failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.get('/health/detailed', async (_req, res) => {
  try {
    const [, dbTables] = await Promise.all([
      prisma.$queryRaw`SELECT 1 as status`,
      prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `,
    ]);

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
      },
      database: {
        status: 'connected',
        tables: dbTables,
      },
      services: {
        api: 'running',
        database: 'connected',
      },
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export { router as healthRoutes };
