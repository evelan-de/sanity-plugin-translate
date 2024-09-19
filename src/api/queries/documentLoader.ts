import { SanityClient, SanityDocumentLike } from 'sanity';

import { DocumentComparisonMetadataArray } from '../../types/translationApi';
import {
  documentComparisonQuery,
  documentQuery,
  translationQuery,
} from './documentQueries';

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
