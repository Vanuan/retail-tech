import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { v4 as uuidv4 } from 'uuid';

export const recordInteraction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId } = req.params;
    const {
      variantId,
      sessionId,
      anonymousId,
      type,
      elementId,
      elementType,
      metadata,
      userId,
      timestamp = new Date().toISOString(),
    } = req.body;

    console.log(`📝 Recording interaction for test ${testId}, type: ${type}`);

    // Check if test exists and is active
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: { variants: true },
    });

    if (!test) {
      console.warn(`❌ Test not found: ${testId}`);
      res.status(404).json({ 
        error: 'Test not found',
        testId,
      });
      return;
    }

    if (test.status !== 'ACTIVE') {
      console.warn(`⚠️ Test ${testId} is not active (status: ${test.status})`);
      res.status(400).json({ 
        error: 'Test is not active',
        testId,
        status: test.status,
      });
      return;
    }

    // Verify variant belongs to this test if provided
    let variant = null;
    if (variantId) {
      variant = test.variants.find(v => v.id === variantId);
      if (!variant) {
        console.warn(`❌ Invalid variant ${variantId} for test ${testId}`);
        res.status(400).json({ 
          error: 'Invalid variant for this test',
          testId,
          variantId,
        });
        return;
      }
    }

    // Record the interaction
    const interaction = await prisma.interaction.create({
      data: {
        id: uuidv4(),
        testId,
        variantId: variantId || null,
        sessionId,
        anonymousId,
        userId: userId || null,
        type,
        elementId: elementId || null,
        elementType: elementType || null,
        metadata: metadata || {},
        timestamp: new Date(timestamp),
      },
      include: {
        variant: {
          select: {
            id: true,
            name: true,
            identifier: true,
          },
        },
      },
    });

    console.log(`✅ Interaction recorded: ${interaction.id}`);

    res.status(201).json({
      success: true,
      data: {
        interactionId: interaction.id,
        testId: interaction.testId,
        variantId: interaction.variantId,
        sessionId: interaction.sessionId,
        timestamp: interaction.timestamp,
        type: interaction.type,
      },
      meta: {
        recordedAt: new Date().toISOString(),
        testName: test.name,
        variantName: interaction.variant?.name,
      },
    });

  } catch (error: any) {
    console.error('❌ Error recording interaction:', error);
    
    // Handle Prisma errors
    if (error.code === 'P2002') {
      res.status(409).json({
        error: 'Duplicate interaction detected',
        details: 'This interaction has already been recorded',
      });
      return;
    }
    
    if (error.code === 'P2003') {
      res.status(400).json({
        error: 'Foreign key constraint failed',
        details: 'Invalid test or variant reference',
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to record interaction',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: error.code,
    });
  }
};

export const getTestInteractions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId } = req.params;
    const { 
      page = 1, 
      limit = 50,
      startDate,
      endDate,
      type,
      variantId,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    
    // Build filter conditions
    const where: any = { testId };
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate as string);
      if (endDate) where.timestamp.lte = new Date(endDate as string);
    }
    
    if (type) where.type = type;
    if (variantId) where.variantId = variantId;

    const [interactions, total, test] = await Promise.all([
      prisma.interaction.findMany({
        where,
        include: { 
          variant: {
            select: {
              id: true,
              name: true,
              identifier: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.interaction.count({ where }),
      prisma.test.findUnique({
        where: { id: testId },
        select: { name: true, status: true },
      }),
    ]);

    // Calculate interaction statistics
    const stats = await prisma.interaction.groupBy({
      by: ['type', 'variantId'],
      where: { testId },
      _count: true,
    });

    res.json({
      success: true,
      data: interactions,
      meta: {
        test,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
        statistics: stats.reduce((acc: Record<string, Record<string, number>>, curr) => {
          const key = curr.variantId || 'no-variant';
          if (!acc[key]) acc[key] = {};
          acc[key][curr.type] = curr._count;
          return acc;
        }, {}),
      },
    });

  } catch (error: any) {
    console.error('❌ Error fetching interactions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch interactions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const getInteractionStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId } = req.params;
    const { startDate, endDate } = req.query;

    const where: any = { testId };
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate as string);
      if (endDate) where.timestamp.lte = new Date(endDate as string);
    }

    const [totalInteractions, byType, byVariant] = await Promise.all([
      prisma.interaction.count({ where }),
      prisma.interaction.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
      prisma.interaction.groupBy({
        by: ['variantId'],
        where,
        _count: true,
      }),
    ]);

    // Get unique sessions and users
    const uniqueSessions = await prisma.interaction.groupBy({
      by: ['sessionId'],
      where,
    });

    const uniqueUsers = await prisma.interaction.groupBy({
      by: ['anonymousId'],
      where,
    });

    res.json({
      success: true,
      data: {
        totalInteractions,
        byType,
        byVariant,
        summary: {
          uniqueSessions: uniqueSessions.length,
          uniqueUsers: uniqueUsers.length,
        },
      },
    });

  } catch (error: any) {
    console.error('❌ Error fetching interaction stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch interaction statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
