import { z } from 'zod';

/**
 * Zod schema for GET /api/preferences query params
 * Currently no required params, but validates any unexpected ones
 */
export const getPreferencesQuerySchema = z.object({}).strict();

/**
 * Zod schema for POST /api/preferences
 * Manual preference update — all fields optional
 */
export const updatePreferencesSchema = z.object({
  category_weights: z
    .record(
      z.string(),
      z.number({ invalid_type_error: 'weights must be numbers' }).min(0).max(1),
      { description: 'category_weights must be an object of category->weight mappings' },
    )
    .optional(),

  keyword_weights: z
    .record(
      z.string(),
      z.number({ invalid_type_error: 'weights must be numbers' }).min(0).max(1),
      { description: 'keyword_weights must be an object of keyword->weight mappings' },
    )
    .optional(),

  excluded_categories: z
    .array(z.string(), { message: 'excluded_categories must be an array of strings' })
    .optional(),
});

/** Inferred type from the update preferences schema */
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
