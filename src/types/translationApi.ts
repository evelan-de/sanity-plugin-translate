import { SanityClient } from 'sanity';
import { z } from 'zod';

// Field key configuration interface
export interface FieldKeyConfig {
  customTranslatableFieldKeys?: (string | { type: string[]; key: string })[];
  customTranslatableArrayFieldKeys?: string[];
  excludeDefaultFieldKeys?: string[];
  excludeDefaultArrayFieldKeys?: string[];
}

export interface TranslationServiceOptions {
  client: SanityClient;
  previewClient?: SanityClient;
  deeplApiKey: string;
  fieldKeyConfig?: FieldKeyConfig;
}

export const documentComparisonMetadata = z.object({
  _id: z.string(),
  _updatedAt: z.string(),
});

export const documentTranslatedMetaData = z.object({
  _id: z.string(),
  language: z.string(),
  _originalId: z.string().nullable(),
});

export const documentComparisonMetadataArray = z.array(
  documentComparisonMetadata,
);

export type DocumentComparisonMetadata = z.infer<
  typeof documentComparisonMetadata
>;

export type DocumentTranslatedMetaData = z.infer<
  typeof documentTranslatedMetaData
>;
export type DocumentComparisonMetadataArray = z.infer<
  typeof documentComparisonMetadataArray
>;

export const translationMetadata = z
  .object({
    before: z
      .object({
        _createdAt: z.string(),
        _id: z.string(),
        _rev: z.string(),
        _type: z.literal('translation.metadata'),
        _updatedAt: z.string(),
        schemaTypes: z.array(z.string()),
        translations: z.array(
          z.object({
            _key: z.string(),
            _type: z.string(),
            value: z
              .object({
                _ref: z.string(),
                _strengthenOnPublish: z
                  .object({
                    type: z.string(),
                  })
                  .optional()
                  .nullable(),
                _type: z.string(),
                _weak: z.boolean().optional().nullable(),
              })
              .optional()
              .nullable(),
          }),
        ),
      })
      .nullable(),
    after: z.object({
      _createdAt: z.string(),
      _id: z.string(),
      _rev: z.string(),
      _type: z.literal('translation.metadata'),
      _updatedAt: z.string(),
      schemaTypes: z.array(z.string()),
      translations: z.array(
        z.object({
          _key: z.string(),
          _type: z.string(),
          value: z
            .object({
              _ref: z.string(),
              _strengthenOnPublish: z
                .object({
                  type: z.string(),
                })
                .optional()
                .nullable(),
              _type: z.string(),
              _weak: z.boolean().optional().nullable(),
            })
            .optional()
            .nullable(),
        }),
      ),
    }),
  })
  .optional();

export const translationApiRequestBody = z.union([
  translationMetadata,
  z.object({
    docId: z.string().nullable(),
    type: z.string().nullable(),
    published: z.boolean().nullable().optional(),
  }),
]);

export type TranslationMetadata = z.infer<typeof translationMetadata>;
export type TranslationApiRequestBody = z.infer<
  typeof translationApiRequestBody
>;
