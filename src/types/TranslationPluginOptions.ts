import { z } from 'zod';

// Define the Zod schema for MediaVideoPluginOptions
export const translatePluginOptionsSchema = z.object({
  BASE_URL: z.string().optional(),
  includeTranslateAction: z.boolean().optional(), // Optional property to control the inclusion of TranslateAction
  includeFixReferenceAction: z.boolean().optional(), // Optional property to control the inclusion of FixReferenceAction
  includeSyncDocumentsAction: z.boolean().optional(), // Optional property to control the inclusion of FixReferenceAction
});

// Infer the type from the Zod schema
export type TranslationPluginOptions = z.infer<
  typeof translatePluginOptionsSchema
>;
