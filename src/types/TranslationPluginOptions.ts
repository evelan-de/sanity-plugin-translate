import { z } from 'zod';

// Define the Zod schema for MediaVideoPluginOptions
export const translatePluginOptionsSchema = z.object({
  BASE_URL: z.string().optional(),
});

// Infer the type from the Zod schema
export type TranslationPluginOptions = z.infer<
  typeof translatePluginOptionsSchema
>;
