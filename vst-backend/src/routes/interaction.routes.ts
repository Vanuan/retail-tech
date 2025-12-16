import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest';
import { authenticateToken } from '../middleware/auth';
import { 
  recordInteraction,
  getTestInteractions,
  getInteractionStats,
} from '../controllers/interaction.controller';

const router = Router();

// High-volume endpoint for behavioral tracking
// POST /api/v1/interactions/tests/:testId/interactions
router.post(
  '/tests/:testId/interactions',
  [
    param('testId')
      .isUUID()
      .withMessage('Invalid test ID format'),
    
    body('variantId')
      .optional()
      .isUUID()
      .withMessage('Invalid variant ID format'),
    
    body('sessionId')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Session ID is required')
      .isLength({ min: 1, max: 255 })
      .withMessage('Session ID must be between 1 and 255 characters'),
    
    body('anonymousId')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Anonymous ID is required')
      .isLength({ min: 1, max: 255 })
      .withMessage('Anonymous ID must be between 1 and 255 characters'),
    
    body('type')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Interaction type is required')
      .isIn([
        'CLICK', 'VIEW', 'HOVER', 'SCROLL', 
        'ADD_TO_CART', 'PURCHASE', 'PAGEVIEW',
        'SESSION_START', 'SESSION_END', 'IMPRESSION', 'CONVERSION'
      ])
      .withMessage('Invalid interaction type'),
    
    body('elementId')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Element ID must be less than 255 characters'),
    
    body('elementType')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Element type must be less than 100 characters'),
    
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be a valid JSON object'),
    
    body('userId')
      .optional()
      .isUUID()
      .withMessage('Invalid user ID format'),
    
    body('timestamp')
      .optional()
      .isISO8601()
      .withMessage('Timestamp must be in ISO 8601 format'),
    
    validateRequest,
  ],
  recordInteraction
);

// Get interactions for a test (protected)
router.get(
  '/tests/:testId/interactions',
  [
    param('testId')
      .isUUID()
      .withMessage('Invalid test ID format'),
    
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be in ISO 8601 format'),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be in ISO 8601 format'),
    
    query('type')
      .optional()
      .isString()
      .trim()
      .isIn([
        'CLICK', 'VIEW', 'HOVER', 'SCROLL', 
        'ADD_TO_CART', 'PURCHASE', 'PAGEVIEW',
        'SESSION_START', 'SESSION_END', 'IMPRESSION', 'CONVERSION'
      ])
      .withMessage('Invalid interaction type'),
    
    query('variantId')
      .optional()
      .isUUID()
      .withMessage('Invalid variant ID format'),
    
    validateRequest,
    authenticateToken,
  ],
  getTestInteractions
);

// Get interaction statistics for a test
router.get(
  '/tests/:testId/interactions/stats',
  [
    param('testId')
      .isUUID()
      .withMessage('Invalid test ID format'),
    
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be in ISO 8601 format'),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be in ISO 8601 format'),
    
    validateRequest,
    authenticateToken,
  ],
  getInteractionStats
);

export { router as interactionRoutes };
