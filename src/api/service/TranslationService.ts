import * as deepl from 'deepl-node';
import { SanityClient, SanityDocumentLike } from 'sanity';

import {
  DocumentComparisonMetadata,
  DocumentComparisonMetadataArray,
  TranslationApiRequestBody,
  TranslationMetadata,
  TranslationServiceOptions,
} from '../../types/translationApi';
import { processPromisesInChunks } from '../../utils/promiseUtils';
import {
  loadDocumentData,
  loadDocumentTranslationsAndReplace,
  loadDocumentVersions,
  loadOtherDocumentVersions,
  loadOtherDocumentVersionsFull,
} from '../queries/documentLoader';

// add here the string type keys that need to be translated
const translatableFieldKeys = [
  'altText',
  'label',
  'text',
  'title',
  'seoTitle',
  'description',
  'subline',
  'caption',
  'emailSubject',
  'errorTitle',
  'actionButtonLabel',
  'placeholder',
  'featHeader',
  'conHeader',
  'proHeader',
  'faqHeader',
  { type: ['form', 'pageCategory', 'category'], key: 'name' },
];

const mediaObjects = [
  'media',
  'icon',
  'mainImage',
  'sanityIcon',
  'productImage',
];
// add here the array type keys that need to be translated
const translatableArrayFieldKeys = ['keywords'];

/**
 * Replaces translations in the given object based on the provided translation mappings.
 * This function recursively traverses the object and updates string values that match
 * the criteria for translation.
 *
 * @param obj The object to update with translations.
 * @param batchedArrayFieldTranslations Mappings of array fields to their translated values.
 * @param batchedTranslations List of translated strings corresponding to unique fields.
 * @param fieldsToTranslate List of fields eligible for translation.
 * @param uniqueFieldsToTranslate List of unique fields that have been translated.
 */
const replaceTranslations = (
  obj: unknown,
  batchedArrayFieldTranslations: { key: string; value: unknown }[],
  batchedTranslations: string[],
  fieldsToTranslate: { key: string; value: string }[],
  uniqueFieldsToTranslate: { key: string; value: string }[],
) => {
  if (!(typeof obj === 'object' && obj !== null)) return;
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
    // Handle array fields that are marked as translatable
    if (Array.isArray(value) && translatableArrayFieldKeys.includes(key)) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      (obj as Record<string, unknown>)[key] =
        batchedArrayFieldTranslations.find((f) => f.key === key)?.value ||
        value;
      return;
    }

    // Recursively handle nested objects
    if (typeof value === 'object') {
      replaceTranslations(
        value,
        batchedArrayFieldTranslations,
        batchedTranslations,
        fieldsToTranslate,
        uniqueFieldsToTranslate,
      );
      return;
    }

    // Replace string fields that are marked for translation
    if (typeof value === 'string' && value.trim() !== '') {
      const field = fieldsToTranslate.find(
        (f) => f.key === key && f.value === value,
      );
      if (!field) return;

      const translatedFieldIndex = uniqueFieldsToTranslate.findIndex(
        (f) => f.key === field.key && f.value === field.value,
      );
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      (obj as Record<string, unknown>)[key] =
        translatedFieldIndex !== -1 && batchedTranslations[translatedFieldIndex]
          ? batchedTranslations[translatedFieldIndex]
          : value;
    }
  });
};
/**
 * Maps fields within a data object to determine which fields are translatable based on predefined keys.
 * This function recursively explores objects and arrays to identify translatable fields.
 *
 * @param data The data object to be examined for translatable fields.
 * @param parentType The type of the parent object, used to determine if a field is translatable.
 * @returns An object containing two arrays: `fieldsToTranslate` for single string fields and `arrayFieldsToTranslate` for array fields.
 */
const mapFieldsToTranslate = (
  data: unknown,
  parentType: string,
): {
  fieldsToTranslate: { key: string; value: string }[];
  arrayFieldsToTranslate: { key: string; value: string | string[] }[];
} => {
  const fieldsToTranslate: { key: string; value: string }[] = [];
  const arrayFieldsToTranslate: {
    key: string;
    value: string | string[];
  }[] = [];

  // Check if data is an object and not null
  if (!(typeof data === 'object' && data !== null)) {
    return { fieldsToTranslate, arrayFieldsToTranslate };
  }

  // Iterate over each entry in the data object
  Object.entries(data).forEach(([key, value]) => {
    // Handle array fields that are marked as translatable
    if (Array.isArray(value) && translatableArrayFieldKeys.includes(key)) {
      arrayFieldsToTranslate.push({ key, value });
      return;
    }
    // Recursively handle objects to find nested translatable fields
    if (typeof value === 'object') {
      const {
        fieldsToTranslate: nestedFieldsToTranslate,
        arrayFieldsToTranslate: nestedSpecialArrayFieldsToTranslate,
      } = mapFieldsToTranslate(value, value?._type ?? parentType);
      fieldsToTranslate.push(...nestedFieldsToTranslate);
      arrayFieldsToTranslate.push(...nestedSpecialArrayFieldsToTranslate);
      return;
    }
    // Determine if the current field is translatable based on its definition
    const fieldDefinition = translatableFieldKeys.find((f) =>
      typeof f === 'object' ? f.key === key : f === key,
    );
    if (fieldDefinition) {
      const isTranslatable =
        typeof fieldDefinition === 'string'
          ? parentType
          : fieldDefinition.type.includes(parentType);
      // Add field to translatable list if it meets criteria
      if (isTranslatable && typeof value === 'string' && value.trim() !== '') {
        fieldsToTranslate.push({ key, value });
      }
    }
  });

  return { fieldsToTranslate, arrayFieldsToTranslate };
};

export const findDocumentType = (data: TranslationApiRequestBody) => {
  if (!data) {
    return null;
  }
  if ('type' in data && data.type) {
    return data.type;
  }
  if (!('before' in data && 'after' in data)) {
    return null;
  }
  const newTranslation = findNewTranslation(data);
  if (!newTranslation?.value?._strengthenOnPublish.type) {
    return null;
  }
  return newTranslation.value._strengthenOnPublish.type;
};

function findNewTranslation(payload: TranslationMetadata) {
  if (!payload) {
    return null;
  }

  const { before, after } = payload;

  if (!before) {
    const newTranslation = after.translations[after.translations.length - 1];
    if (!newTranslation.value) {
      return null;
    }
    newTranslation.value._ref = `drafts.${newTranslation.value._ref}`;
    return newTranslation;
  }

  const beforeKeys = new Set(
    before.translations.map((translation) => translation._key),
  );

  const newTranslation = after.translations.find(
    (translation) => !beforeKeys.has(translation._key),
  );

  if (!newTranslation?.value) {
    return null;
  }

  newTranslation.value._ref = `drafts.${newTranslation.value._ref}`;

  return newTranslation;
}

const findLatestDocumentId = async (
  data: TranslationApiRequestBody,
  client: SanityClient,
) => {
  if (!data) {
    return null;
  }
  if ('docId' in data && data.docId) {
    const latestDocumentVersions: DocumentComparisonMetadataArray | null =
      await loadDocumentVersions(data.docId, client);

    if (!latestDocumentVersions || latestDocumentVersions.length === 0) {
      return null;
    }

    // Sort the array based on the _updatedAt field in descending order and pick the first one
    const latestVersion: DocumentComparisonMetadata =
      latestDocumentVersions.sort(
        (a, b) =>
          new Date(b._updatedAt).getTime() - new Date(a._updatedAt).getTime(),
      )[0];

    return latestVersion._id;
  }

  if (!('before' in data && 'after' in data)) {
    return null;
  }
  const newTranslation = findNewTranslation(data);
  if (!newTranslation?.value?._ref) {
    return null;
  }

  return newTranslation.value._ref;
};

async function translateJSONData(
  jsonData: SanityDocumentLike & {
    language?: string;
    _originalId?: string;
    __i18n_lang?: string;
    _rev?: string;
    __i18n_refs?: { _key?: string; _ref?: string; _type?: string }[];
  },
  language: deepl.TargetLanguageCode,
  deeplApiKey: string,
) {
  const authKey = deeplApiKey;

  if (!authKey) {
    throw new Error('No API key found');
  }

  const { fieldsToTranslate, arrayFieldsToTranslate } = mapFieldsToTranslate(
    jsonData,
    jsonData._type,
  );

  const translator = new deepl.Translator(authKey);
  const uniqueFieldsToTranslate = [...new Set(fieldsToTranslate)];
  const uniqueSpecialArrayFieldsToTranslate = [
    ...new Set(arrayFieldsToTranslate),
  ];

  const batchedArrayFieldTranslations: { key: string; value: unknown }[] = [];
  for (let i = 0; i < uniqueSpecialArrayFieldsToTranslate.length; i += 50) {
    const batch = uniqueSpecialArrayFieldsToTranslate.slice(i, i + 50);
    const batchValues = batch
      .map((field) =>
        Array.isArray(field.value) ? field.value.flat() : field.value,
      )
      .flat();
    const translations = await translator.translateText(
      batchValues.filter(
        (value) => typeof value === 'string' && value.trim() !== '',
      ),
      null,
      language,
    );
    batchedArrayFieldTranslations.push({
      key: batch[0].key,
      value: translations.map((translation) => translation.text),
    });
  }

  const batchedTranslations: string[] = [];
  for (let i = 0; i < uniqueFieldsToTranslate.length; i += 50) {
    const batch = uniqueFieldsToTranslate.slice(i, i + 50);
    const textToTranslate = batch
      .map((field) => ({
        original: field.value,
        lowercased:
          typeof field.value === 'string'
            ? field.value.toLowerCase()
            : field.value,
      }))
      .filter(
        (item) =>
          typeof item.lowercased === 'string' && item.lowercased.trim() !== '',
      );

    const translations = await translator.translateText(
      textToTranslate.map((item) =>
        item.original === item.original.toUpperCase()
          ? item.lowercased
          : item.original,
      ),
      null,
      language,
    );

    const formattedTranslations = translations.map((translation, index) => {
      const originalText = textToTranslate[index].original;
      const leadingSpace = originalText.startsWith(' ') ? ' ' : '';
      const trailingSpace = originalText.endsWith(' ') ? ' ' : '';
      const adjustedTranslation =
        leadingSpace + translation.text + trailingSpace;
      return originalText === originalText.toUpperCase()
        ? adjustedTranslation.toUpperCase()
        : adjustedTranslation;
    });

    batchedTranslations.push(...formattedTranslations);
  }

  const translatedJsonData = jsonData;

  replaceTranslations(
    translatedJsonData,
    batchedArrayFieldTranslations,
    batchedTranslations,
    fieldsToTranslate,
    uniqueFieldsToTranslate,
  );

  return { translatedJsonData, batchedTranslations };
}

function replaceRefId(obj: unknown, originalId: string, newId: string) {
  if (Array.isArray(obj)) {
    obj.forEach((item) => replaceRefId(item, originalId, newId));
    return;
  }

  if (obj === null || typeof obj !== 'object') {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const objectWithRef = obj as { _ref?: string };
  if (objectWithRef._ref === originalId) {
    objectWithRef._ref = newId;
  }

  Object.values(obj).forEach((value) => replaceRefId(value, originalId, newId));
}

function findAllReferenceObjects(obj: unknown, result: unknown[] = []) {
  if (Array.isArray(obj)) {
    obj.forEach((item) => findAllReferenceObjects(item, result));
    return result;
  }

  if (obj === null || typeof obj !== 'object') {
    return result;
  }

  if (typeof obj === 'object' && '_type' in obj && obj._type === 'reference') {
    result.push(obj);
  }

  Object.values(obj).forEach((value) => findAllReferenceObjects(value, result));

  return result;
}

const processReferenceObjects = async (
  referenceObjects: unknown[],
  documentData: SanityDocumentLike,
  documentLanguage: string,
  client: SanityClient,
) => {
  const promises = referenceObjects.map(async (referenceObject: unknown) => {
    try {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const referenceObjectId: string = (referenceObject as { _ref: string })
        ._ref;

      const documentTranslations: {
        originalId: string;
        newId: string | undefined;
      } | null = await loadDocumentTranslationsAndReplace(
        referenceObjectId,
        documentLanguage,
        client,
      );

      if (documentTranslations?.newId === undefined) {
        return;
      }
      // eslint-disable-next-line no-unused-expressions
      [];

      replaceRefId(
        documentData,
        documentTranslations.originalId,
        documentTranslations.newId,
      );
    } catch (error) {
      console.error(`Error processing reference object: ${error}`);
      // Optionally handle errors, e.g., continue processing other items, log errors, etc.
    }
  });

  // No need to get the return value, just process the promises in chunks
  await processPromisesInChunks(promises, 3);

  return documentData; // Return the modified documentData
};

const mapFieldsToCopy = (
  data: unknown,
  parentId: string | undefined,
  xPath: string | null,
): {
  mediaObjectsToCopy: {
    key: string;
    value: unknown;
    parentId: string | undefined;
    xPath: string | null;
  }[];
} => {
  const mediaObjectsToCopy: {
    key: string;
    value: unknown;
    parentId: string | undefined;
    xPath: string | null;
  }[] = [];

  // Check if data is an object and not null
  if (!(typeof data === 'object' && data !== null)) {
    return { mediaObjectsToCopy };
  }

  // Iterate over each entry in the data object
  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    // Construct the XPath for the current node
    const currentXPath = xPath ? `${xPath}/${key}` : key;

    // Handle media objects
    if (mediaObjects.includes(key) && typeof value === 'object') {
      mediaObjectsToCopy.push({ key, value, parentId, xPath: currentXPath });
      return;
    }
    // Recursively handle objects to find nested media objects
    if (typeof value === 'object') {
      const currentParentId = (value as any)._key || undefined; // Use _key if available, otherwise fallback to parentId
      const { mediaObjectsToCopy: nestedMediaObjectsToCopy } = mapFieldsToCopy(
        value,
        currentParentId,
        currentXPath,
      );
      mediaObjectsToCopy.push(...nestedMediaObjectsToCopy);
    }
  });

  return { mediaObjectsToCopy };
};

interface MediaObject {
  key: string;
  value: unknown;
  parentId: string | undefined;
  xPath: string | null;
}

/**
 * Replaces media objects in the target document based on matching parentId and xPath.
 *
 * @param mediaObjectsToCopy Array of media objects to be copied.
 * @param targetDocument The document in which media objects will be replaced.
 * @returns The updated target document with replaced media objects.
 */
// Start of Selection
function replaceMatchingMediaObjects(
  mediaObjectsToCopy: MediaObject[],
  targetDocument: SanityDocumentLike,
): SanityDocumentLike {
  // Create a deep copy of the targetDocument to avoid mutating the original
  const targetDocumentCopy = JSON.parse(JSON.stringify(targetDocument));

  if (typeof targetDocumentCopy !== 'object' || targetDocumentCopy === null) {
    // console.warn('Target document is not a valid object.');
    return targetDocumentCopy;
  }

  mediaObjectsToCopy.forEach((mediaObj) => {
    const xpathValue = mediaObj.xPath;
    if (!xpathValue) {
      return;
    }
    const pathSegments = xpathValue
      .split('/')
      .filter((segment) => segment !== '');

    if (pathSegments.length === 0) {
      // console.warn(`Invalid xPath: ${mediaObj.xPath}`);
      return;
    }

    const mediaField = pathSegments.pop();
    if (!mediaField) {
      // console.warn(`xPath does not contain a media field: ${mediaObj.xPath}`);
      return;
    }

    let current: any = targetDocumentCopy;

    for (const segment of pathSegments) {
      if (current === undefined || current === null) {
        // console.warn(`Path segment "${segment}" does not exist.`);
        return;
      }

      // Check if the segment is an array index
      const arrayMatch = segment.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const arrayKey = arrayMatch[1];
        const index = parseInt(arrayMatch[2], 10);

        if (!Array.isArray(current[arrayKey])) {
          // console.warn(`Expected "${arrayKey}" to be an array.`);
          return;
        }

        current = current[arrayKey][index];
      } else {
        current = current[segment];
      }
    }

    if (current && typeof current === 'object') {
      if (current._key === mediaObj.parentId) {
        if (mediaField in current) {
          // console.log(
          //   `Replacing media at path "${mediaObj.xPath}" with new media.`,
          // );
          current[mediaField] = mediaObj.value;
        } else {
          // console.warn(
          //   `Media field "${mediaField}" does not exist in the target document.`,
          // );
        }
      } else {
        // console.warn(
        //   `Parent ID mismatch. Expected "${mediaObj.parentId}", found "${current._key}".`,
        // );
      }
    } else {
      // console.warn(
      //   `Unable to locate parent object for xPath "${mediaObj.xPath}".`,
      // );
    }
  });

  return targetDocumentCopy;
}

export class TranslationService {
  private client: SanityClient;
  private previewClient?: SanityClient;
  private deeplApiKey: string;

  constructor(config: TranslationServiceOptions) {
    this.client = config.client;
    this.previewClient = config.previewClient;
    this.deeplApiKey = config.deeplApiKey;
  }

  public async syncDocumentMedia({
    data,
  }: {
    data: TranslationApiRequestBody;
  }) {
    // find the document ID and document type of the document to be translated, from the object passed from the webhook
    const docId = await findLatestDocumentId(data, this.client);
    const type = findDocumentType(data);
    if (!this.previewClient) {
      throw new Error('No preview client found');
    }

    if (!docId || !type) {
      throw new Error('No document ID or type found');
    }

    // Load the document data from the server
    const originalDocument = await loadDocumentData(docId, type, this.client);
    if (!originalDocument) {
      throw new Error('No document data found');
    }

    const otherDocumentVersions = await loadOtherDocumentVersionsFull(
      docId.replace(/^drafts\./, ''),
      this.previewClient,
    );

    if (!otherDocumentVersions) {
      throw new Error('No other document versions found');
    }

    // Find all reference objects within the document body
    const { mediaObjectsToCopy } = mapFieldsToCopy(
      originalDocument,
      undefined,
      null,
    );

    // Replace the forEach loop with a for...of loop
    const updatedDocuments: SanityDocumentLike[] = [];

    for (const doc of otherDocumentVersions) {
      if (!doc || typeof doc !== 'object' || !doc._id) {
        console.error('Invalid document encountered:', otherDocumentVersions);
        continue; // Skip this iteration if the document is invalid
      }
      if (docId === doc._id) {
        continue;
      }
      // Process the reference objects to prepare for translation
      const updatedDocument = replaceMatchingMediaObjects(
        mediaObjectsToCopy,
        doc,
      );
      updatedDocuments.push(updatedDocument as SanityDocumentLike);

      const {
        _id,
        language,
        _rev,
        __i18n_lang,
        __i18n_refs,
        _originalId,
        _translations,
        metadata,
        _createdAt,
        _updatedAt,
        ...otherFields
      } = updatedDocument;

      if ('_originalId' in doc) {
        await this.client
          ?.patch(doc._originalId as string)
          .set({ ...otherFields })
          .commit();

        continue;
      }

      await this.client
        .patch(doc._id)
        .set({ ...otherFields })
        .commit();
    }

    return {
      mediaObjectsToCopy,
      originalOtherDocumentVersions: otherDocumentVersions,
      updatedDocuments,
    };
  }

  public async syncDocuments({ data }: { data: TranslationApiRequestBody }) {
    // find the document ID and document type of the document to be translated, from the object passed from the webhook
    const docId = await findLatestDocumentId(data, this.client);
    const type = findDocumentType(data);
    if (!this.previewClient) {
      throw new Error('No preview client found');
    }

    if (!docId || !type) {
      throw new Error('No document ID or type found');
    }

    // Load the document data from the server
    const originalDocument = await loadDocumentData(docId, type, this.client);
    if (!originalDocument) {
      throw new Error('No document data found');
    }

    const otherDocumentVersions = await loadOtherDocumentVersions(
      docId.replace(/^drafts\./, ''),
      this.previewClient,
    );

    if (!otherDocumentVersions) {
      throw new Error('No other document versions found');
    }

    // Find all reference objects within the document body
    const referenceObjects = findAllReferenceObjects(originalDocument);

    // Replace the forEach loop with a for...of loop
    const updatedDocuments: SanityDocumentLike[] = [];

    for (const doc of otherDocumentVersions) {
      if (!doc || typeof doc !== 'object' || !doc._id) {
        console.error('Invalid document encountered:', otherDocumentVersions);
        continue; // Skip this iteration if the document is invalid
      }
      if (docId === doc._id) {
        continue;
      }
      // Process the reference objects to prepare for translation

      try {
        // Adjust the language code if necessary
        let documentLanguage = doc.language;

        const processedDocumentData = await processReferenceObjects(
          referenceObjects,
          originalDocument, // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          documentLanguage as string,
          this.client,
        );

        if (documentLanguage === 'en') {
          documentLanguage = 'en-US';
        }

        const { translatedJsonData } = await translateJSONData(
          processedDocumentData, // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          documentLanguage as deepl.TargetLanguageCode,
          this.deeplApiKey,
        );
        const {
          _id,
          language,
          _rev,
          __i18n_lang,
          __i18n_refs,
          _originalId,
          _translations,
          metadata,
          _createdAt,
          _updatedAt,
          ...otherFields
        } = translatedJsonData;

        updatedDocuments.push({ ...otherFields, _id: doc._id });
        const id = doc._id;

        if ('_originalId' in doc) {
          await this.client
            ?.patch(doc._originalId as string)
            .set({ ...otherFields })
            .commit();

          continue;
        }

        await this.client
          .patch(id)
          .set({ ...otherFields })
          .commit();
      } catch (e) {
        console.error(`Error translating JSON data: ${e}`);
      }
    }

    return { otherDocumentVersions, updatedDocuments };
  }

  public async translateDocument({
    data,
  }: {
    data: TranslationApiRequestBody;
  }) {
    // find the document ID and document type of the document to be translated, from the object passed from the webhook
    const docId = await findLatestDocumentId(data, this.client);
    const type = findDocumentType(data);

    if (!docId || !type) {
      throw new Error('No document ID or type found');
    }

    // Load the document data from the server
    const document = await loadDocumentData(docId, type, this.client);
    if (!document) {
      throw new Error('No document data found');
    }

    // Extract the language from the document data
    let language = document.language;
    if (!language) {
      throw new Error('No language found');
    }

    // Find all reference objects within the document body
    const referenceObjects = findAllReferenceObjects(document);

    // Process the reference objects to prepare for translation
    const processedDocumentData = await processReferenceObjects(
      referenceObjects,
      document, // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      language as string,
      this.client,
    );

    // Adjust the language code if necessary
    if (language === 'en') {
      language = 'en-US';
    }

    // Translate the processed document data using the DeepL API
    const { translatedJsonData } = await translateJSONData(
      processedDocumentData, // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      language as deepl.TargetLanguageCode,
      this.deeplApiKey,
    );

    await this.client
      .patch(translatedJsonData._id)
      .set({ ...translatedJsonData })
      .commit();

    return { translatedJsonData };
  }

  public async fixReference({ data }: { data: TranslationApiRequestBody }) {
    // find the document ID and document type of the document to be translated, from the object passed from the webhook
    const docId = await findLatestDocumentId(data, this.client);
    const type = findDocumentType(data);

    if (!docId || !type) {
      throw new Error('No document ID or type found');
    }
    // Load the document data from the server
    const document = await loadDocumentData(docId, type, this.client);
    if (!document) {
      throw new Error('No document data found');
    }

    const language = document.language;

    if (!language) {
      throw new Error('No language found');
    }

    const referenceObjects = findAllReferenceObjects(document);

    const processedDocumentData = await processReferenceObjects(
      referenceObjects,
      document,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      language as string,
      this.client,
    );

    await this.client
      .patch(processedDocumentData._id)
      .set({ ...processedDocumentData })
      .commit();

    return { processedDocumentData };
  }
}
