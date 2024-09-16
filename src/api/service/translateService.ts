import * as deepl from 'deepl-node';
import { SanityClient, SanityDocumentLike } from 'sanity';

import { processPromisesInChunks } from '../../utils/promiseUtils';
import { loadDocumentTranslationsAndReplace } from '../queries/documentLoader';

// add here the string type keys that need to be translated
const translatableFieldKeys = [
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
  { type: ['form', 'pageCategory', 'category'], key: 'name' },
];

// add here the array type keys that need to be translated
const translatableArrayFieldKeys = ['keywords'];

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

/**
 * Translates the document data for a given document ID and type.
 * This function loads the document data, identifies the language, finds all reference objects within the document,
 * processes these references, and then translates the document data into the specified language using the DeepL API.
 * Finally, it updates the document in the Sanity server with the translated data.
 *
 * @param {string} docID - The ID of the document to be translated.
 * @param {string} type - The type of the document.
 * @returns {Promise<{translatedJsonData: any}>} - Returns an object containing the translated document data.
 * @throws {Error} - Throws an error if no document data or language is found.
 */

export const translateDocument = async (
  document: SanityDocumentLike,
  client: SanityClient,
) => {
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
    client,
  );

  // Adjust the language code if necessary
  if (language === 'en') {
    language = 'en-US';
  }

  // Translate the processed document data using the DeepL API
  const { translatedJsonData } = await translateJSONData(
    processedDocumentData, // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    language as deepl.TargetLanguageCode,
  );

  return { translatedJsonData };
};

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

/**
 * Translates JSON data using the DeepL API based on specified language.
 *
 * This function takes a SanityDocumentLike JSON object and a target language code,
 * then performs translation of the document's fields and array fields marked for translation.
 * It uses the DeepL API for translating text and handles batch translations to optimize API calls.
 *
 * @param {SanityDocumentLike} jsonData - The JSON data to be translated.
 * @param {deepl.TargetLanguageCode} language - The target language code for translation.
 * @returns {Promise<{translatedJsonData: SanityDocumentLike, batchedTranslations: string[]}>}
 *          Returns an object containing the translated JSON data and an array of batched translations.
 * @throws {Error} Throws an error if the DeepL API key is not found.
 */
async function translateJSONData(
  jsonData: SanityDocumentLike,
  language: deepl.TargetLanguageCode,
) {
  const authKey = process.env.DEEPL_API_KEY;

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
      return originalText === originalText.toUpperCase()
        ? translation.text.toUpperCase()
        : translation.text;
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

export const fixReference = async (
  documentData: SanityDocumentLike,
  client: SanityClient,
) => {
  if (!documentData) {
    throw new Error('No document data found');
  }

  const language = documentData.language;

  if (!language) {
    throw new Error('No language found');
  }

  const referenceObjects = findAllReferenceObjects(documentData);

  const processedDocumentData = await processReferenceObjects(
    referenceObjects,
    documentData,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    language as string,
    client,
  );

  return { processedDocumentData };
};
