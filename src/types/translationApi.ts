import { SanityClient } from 'sanity';
import { z } from 'zod';

export interface TranslationServiceOptions {
  client: SanityClient;
  deeplApiKey: string;
}

export const documentComparisonMetadata = z.object({
  _id: z.string(),
  _updatedAt: z.string(),
});

export const documentComparisonMetadataArray = z.array(
  documentComparisonMetadata,
);

export type DocumentComparisonMetadata = z.infer<
  typeof documentComparisonMetadata
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
                _strengthenOnPublish: z.object({
                  type: z.string(),
                }),
                _type: z.string(),
                _weak: z.boolean(),
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
              _strengthenOnPublish: z.object({
                type: z.string(),
              }),
              _type: z.string(),
              _weak: z.boolean(),
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
  }),
]);

export type TranslationMetadata = z.infer<typeof translationMetadata>;
export type TranslationApiRequestBody = z.infer<
  typeof translationApiRequestBody
>;
