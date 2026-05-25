import { z } from 'zod';

/**
 * Zod schema for POST /api/swipe
 * Validates swipe interaction body
 */
export const createSwipeSchema = z.object({
  idea_id: z.coerce
    .number({ required_error: 'idea_id is required', invalid_type_error: 'idea_id must be a number' })
    .int('idea_id must be an integer')
    .positive('idea_id must be a positive integer'),

  direction: z.enum(['left', 'right', 'up'], {
    required_error: 'direction is required (left, right, or up)',
    invalid_type_error: 'direction must be "left", "right", or "up"',
  }),

  dwell_time_ms: z
    .number({ invalid_type_error: 'dwell_time_ms must be a number' })
    .int('dwell_time_ms must be an integer')
    .nonnegative('dwell_time_ms must be non-negative')
    .optional(),

  rating: z
    .number({ invalid_type_error: 'rating must be a number' })
    .int('rating must be an integer')
    .min(1, 'rating must be between 1 and 5')
    .max(5, 'rating must be between 1 and 5')
    .optional(),
});

/** Inferred type from the swipe schema */
export type CreateSwipeInput = z.infer<typeof createSwipeSchema>;
