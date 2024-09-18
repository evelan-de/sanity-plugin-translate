import { SanityClient, SanityDocumentLike } from 'sanity';
import { z } from 'zod';

import {
  documentComparisonQuery,
  documentQuery,
  translationQuery,
} from './documentQueries';

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

export async function loadDocumentData(
  docId: string,
  type: string,
  client: SanityClient,
): Promise<SanityDocumentLike | null> {
  const query = documentQuery;

  const documentData = await client.fetch<SanityDocumentLike>(query, {
    id: docId,
    type: type,
  });
  return documentData;
}

export async function loadDocumentVersions(
  docId: string,
  client: SanityClient,
): Promise<DocumentComparisonMetadataArray | null> {
  const query = documentComparisonQuery;

  const documentData = await client.fetch<DocumentComparisonMetadataArray>(
    query,
    {
      id: docId,
    },
  );
  return documentData;
}

export async function loadDocumentTranslationsAndReplace(
  docId: string,
  language: string,
  client: SanityClient,
): Promise<{
  originalId: string;
  newId: string | undefined;
} | null> {
  const query = translationQuery;

  const data = await client.fetch<SanityDocumentLike>(query, {
    id: docId,
  });

  if (!Array.isArray(data._translations) || data._translations.length === 0) {
    return null;
  }

  // Find the translation object with the specified language
  const searchedTranslation = data._translations.find(
    (t: { language: string } | null) => t !== null && t.language === language,
  );

  const translation = {
    originalId: docId,
    newId: searchedTranslation?._id,
  };

  return translation;
}
