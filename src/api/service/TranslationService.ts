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
import { MEDIA_OBJECTS } from '../consts';
import {
  loadDocumentData,
  loadDocumentTranslationsAndReplace,
  loadDocumentVersions,
  loadOtherDocumentVersions,
  loadOtherDocumentVersionsFull,
} from '../queries/documentLoader';
import {
  applyBlockContentTranslations,
  clearBlockContentMap,
  isBlockContent,
  processBlockContent,
  processNestedBlockContent,
} from '../utils/blockContentUtils';
import {
  getMergedTranslatableArrayFieldKeys,
  getMergedTranslatableFieldKeys,
} from '../utils/fieldKeyManager';

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
// Create a type for the parameters to avoid the "too many parameters" lint error
type ReplaceTranslationsParams = {
  obj: unknown;
  batchedArrayFieldTranslations: { key: string; value: unknown }[];
  batchedTranslations: string[];
  fieldsToTranslate: { key: string; value: string; context?: string }[];
  translationMap?: Map<string, string>;
  path?: string; // Make path optional with default value
  translatableArrayFieldKeys: string[];
};

const replaceTranslations = ({
  obj,
  batchedArrayFieldTranslations,
  batchedTranslations,
  fieldsToTranslate,
  translationMap,
  path = '', // Default to empty path
  translatableArrayFieldKeys,
}: ReplaceTranslationsParams): void => {
  if (!(typeof obj === 'object' && obj !== null)) {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
    // Skip _translations key to avoid null reference errors
    if (key === '_translations') {
      return;
    }

    // Handle block content translations using our mapping
    if (Array.isArray(value) && translationMap) {
      // Calculate the current path for this array
      const currentArrayPath = path ? `${path}.${key}` : key;

      // Use the utility function to apply translations to block content
      applyBlockContentTranslations({
        value,
        key,
        currentArrayPath,
        translationMap,
        fieldsToTranslate,
        batchedTranslations,
      });
    }

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
      const currentPath = path ? `${path}.${key}` : key;
      replaceTranslations({
        obj: value,
        batchedArrayFieldTranslations,
        batchedTranslations,
        fieldsToTranslate,
        translationMap,
        path: currentPath, // Pass the current path to nested calls
        translatableArrayFieldKeys,
      });
      return;
    }

    // Replace string fields that are marked for translation
    if (typeof value === 'string' && value.trim() !== '') {
      // First try to find an exact match with path-based key
      const field = fieldsToTranslate.find(
        (f) =>
          (f.key === key || f.key.endsWith(`.${key}`)) && f.value === value,
      );
      if (!field) return;

      // Use the translation map if available, otherwise fall back to array index
      let translation;
      if (translationMap && translationMap.has(field.key)) {
        translation = translationMap.get(field.key);
      } else {
        const translatedFieldIndex = fieldsToTranslate.findIndex(
          (f) => f.key === field.key && f.value === field.value,
        );
        translation =
          translatedFieldIndex !== -1
            ? batchedTranslations[translatedFieldIndex]
            : null;
      }

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      (obj as Record<string, unknown>)[key] =
        translation !== null ? translation : value;
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
  path: string = '',
  translatableFieldKeys: (string | { type: string[]; key: string })[],
  translatableArrayFieldKeys: string[],
): {
  fieldsToTranslate: {
    key: string;
    value: string;
    context?: string;
    isHtml?: boolean;
  }[];
  arrayFieldsToTranslate: { key: string; value: string | string[] }[];
} => {
  const fieldsToTranslate: {
    key: string;
    value: string;
    context?: string;
    isHtml?: boolean;
  }[] = [];
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
    // Skip _translations key since this is a special key and no need to translate it
    if (key === '_translations') {
      return;
    }
    // Handle block content arrays (like "body" field)
    if (Array.isArray(value) && isBlockContent(value)) {
      // Use processBlockContent utility function to handle all block content processing
      // Create the array path for this block content array
      const arrayPath = path ? `${path}.${key}` : key;

      // Process the block content array and populate fieldsToTranslate
      processBlockContent(
        value,
        key,
        arrayPath,
        fieldsToTranslate,
        translatableFieldKeys,
      );
      return;
    }

    // Handle array fields that are marked as translatable
    if (Array.isArray(value) && translatableArrayFieldKeys.includes(key)) {
      arrayFieldsToTranslate.push({ key, value });
      return;
    }

    // Recursively handle objects to find nested translatable fields
    if (typeof value === 'object') {
      // Build the current path for this nested object
      const currentPath = path ? `${path}.${key}` : key;

      // Use the utility function to process any nested block content arrays
      processNestedBlockContent({
        object: value as Record<string, unknown>,
        key,
        path,
        fieldsToTranslate,
        translatableFieldKeys,
      });

      const {
        fieldsToTranslate: nestedFieldsToTranslate,
        arrayFieldsToTranslate: nestedSpecialArrayFieldsToTranslate,
      } = mapFieldsToTranslate(
        value,
        value?._type ?? parentType,
        currentPath,
        translatableFieldKeys,
        translatableArrayFieldKeys,
      );
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
        // Create a unique key that includes the path to ensure uniqueness across multiple objects
        const uniqueFieldKey = path ? `${path}.${key}` : key;
        fieldsToTranslate.push({ key: uniqueFieldKey, value });
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
  if (!newTranslation?.value?._strengthenOnPublish?.type) {
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

/**
 * Process items with context individually for better translation quality
 * This will mostly handle block content header blocks
 */
async function processItemsWithContext(
  itemsWithContext: {
    key: string;
    value: string;
    context?: string;
    isHtml?: boolean;
  }[],
  translator: deepl.Translator,
  language: deepl.TargetLanguageCode,
  translationMap: Map<string, string>,
): Promise<void> {
  for (const field of itemsWithContext) {
    if (typeof field.value !== 'string' || field.value.trim() === '') {
      continue;
    }

    // Handle HTML fields differently
    if (field.isHtml) {
      // Translate HTML with tag handling and context
      const translations = await translator.translateText(
        [field.value],
        null,
        language,
        {
          context: field.context,
          tagHandling: 'html',
        },
      );

      // Store translation in the map using the field's key (no formatting needed for HTML)
      translationMap.set(field.key, translations[0].text);
    } else {
      // Handle regular text fields with context
      const textToTranslate = {
        original: field.value,
        lowercased: field.value.toLowerCase(),
        context: field.context,
      };

      // Translate with context
      const translations = await translator.translateText(
        [textToTranslate.original],
        null,
        language,
        {
          context: textToTranslate.context,
        },
      );

      // Store translation in the map using the field's key
      let translatedText = translations[0].text;

      // Preserve original capitalization if the original was all lowercase
      if (textToTranslate.lowercased === textToTranslate.original) {
        translatedText = translatedText.toLowerCase();
      }

      // Preserve leading/trailing spaces
      const leadingSpaces = textToTranslate.original.match(/^\s*/);
      const trailingSpaces = textToTranslate.original.match(/\s*$/);
      if (leadingSpaces || trailingSpaces) {
        translatedText =
          (leadingSpaces ? leadingSpaces[0] : '') +
          translatedText.trim() +
          (trailingSpaces ? trailingSpaces[0] : '');
      }

      translationMap.set(field.key, translatedText);
    }
  }
}

/**
 * Process items without context in batches for efficiency
 */
async function processItemsWithoutContext(
  itemsWithoutContext: {
    key: string;
    value: string;
    context?: string;
    isHtml?: boolean;
  }[],
  translator: deepl.Translator,
  language: deepl.TargetLanguageCode,
  translationMap: Map<string, string>,
): Promise<void> {
  // Separate HTML and regular items within this batch
  const htmlItemsWithoutContext = itemsWithoutContext.filter(
    (field) => field.isHtml,
  );
  const regularItemsWithoutContext = itemsWithoutContext.filter(
    (field) => !field.isHtml,
  );

  // Process HTML items without context in batches
  for (let i = 0; i < htmlItemsWithoutContext.length; i += 50) {
    const batch = htmlItemsWithoutContext.slice(i, i + 50);
    const htmlToTranslate = batch
      .map((field) => ({
        original: field.value,
        fieldKey: field.key,
      }))
      .filter(
        (item) =>
          typeof item.original === 'string' && item.original.trim() !== '',
      );

    if (htmlToTranslate.length === 0) {
      continue;
    }

    // Translate HTML with tag handling
    const translations = await translator.translateText(
      htmlToTranslate.map((item) => item.original),
      null,
      language,
      {
        tagHandling: 'html',
      },
    );

    // Map each translation back to its original field key
    translations.forEach((translation, index) => {
      const item = htmlToTranslate[index];
      // Store in the map using the field's key (no formatting needed for HTML)
      translationMap.set(item.fieldKey, translation.text);
    });
  }

  // Process regular items without context in batches for efficiency
  for (let i = 0; i < regularItemsWithoutContext.length; i += 50) {
    const batch = regularItemsWithoutContext.slice(i, i + 50);
    const textToTranslate = batch
      .map((field, idx) => ({
        original: field.value,
        lowercased:
          typeof field.value === 'string'
            ? field.value.toLowerCase()
            : field.value,
        fieldKey: field.key, // Track the original field key
        batchIndex: idx, // Track position in this batch
      }))
      .filter(
        (item) =>
          typeof item.lowercased === 'string' && item.lowercased.trim() !== '',
      );

    if (textToTranslate.length === 0) {
      continue;
    }

    const translations = await translator.translateText(
      textToTranslate.map((item) =>
        item.original === item.original.toUpperCase()
          ? item.lowercased
          : item.original,
      ),
      null,
      language,
    );

    // Map each translation back to its original field key
    translations.forEach((translation, index) => {
      const item = textToTranslate[index];
      const originalText = item.original;
      const leadingSpace = originalText.startsWith(' ') ? ' ' : '';
      const trailingSpace = originalText.endsWith(' ') ? ' ' : '';
      const adjustedTranslation =
        leadingSpace + translation.text + trailingSpace;

      const formattedTranslation =
        originalText === originalText.toUpperCase()
          ? adjustedTranslation.toUpperCase()
          : adjustedTranslation;

      // Store in the map using the field's key
      translationMap.set(item.fieldKey, formattedTranslation);
    });
  }
}

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
  translatableFieldKeys: (string | { type: string[]; key: string })[],
  translatableArrayFieldKeys: string[],
) {
  // Clear the block content map at the start of each translation operation
  clearBlockContentMap();

  const authKey = deeplApiKey;
  if (!authKey) {
    throw new Error('No API key found');
  }

  const { fieldsToTranslate, arrayFieldsToTranslate } = mapFieldsToTranslate(
    jsonData,
    jsonData._type,
    '', // Start with an empty path for the root object
    translatableFieldKeys,
    translatableArrayFieldKeys,
  );

  // Process fields to translate
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

  // Create a translation map keyed by unique field keys instead of using array indices
  const translationMap = new Map<string, string>();

  // Separate by context first (maintaining original efficient structure)
  const itemsWithContext = uniqueFieldsToTranslate.filter(
    (field) => field.context,
  );
  const itemsWithoutContext = uniqueFieldsToTranslate.filter(
    (field) => !field.context,
  );

  // Process items with context individually to provide specific context for each header
  await processItemsWithContext(
    itemsWithContext,
    translator,
    language,
    translationMap,
  );

  // Process items without context in batches for efficiency
  await processItemsWithoutContext(
    itemsWithoutContext,
    translator,
    language,
    translationMap,
  );

  // Create a batchedTranslations array for backward compatibility
  const batchedTranslations = uniqueFieldsToTranslate.map(
    (field) => translationMap.get(field.key) || '',
  );

  const translatedJsonData = jsonData;

  replaceTranslations({
    obj: translatedJsonData,
    batchedArrayFieldTranslations,
    batchedTranslations,
    fieldsToTranslate,
    translationMap,
    path: '', // Start with empty path
    translatableArrayFieldKeys,
  });

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
    if (MEDIA_OBJECTS.includes(key) && typeof value === 'object') {
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
 * This function traverses the target document using the xPath provided for each media object
 * and replaces the media field with the new value if the parentId matches.
 *
 * @param mediaObjectsToCopy - Array of media objects to be copied. Each object contains:
 *   - key: The key of the media object.
 *   - value: The new value to replace the existing media object.
 *   - parentId: The ID of the parent object to match.
 *   - xPath: The path to the media object within the document.
 * @param targetDocument - The document in which media objects will be replaced.
 * @returns The updated target document with replaced media objects.
 */
function replaceMatchingMediaObjects(
  mediaObjectsToCopy: MediaObject[],
  targetDocument: SanityDocumentLike,
): SanityDocumentLike {
  // Create a deep copy of the targetDocument to avoid mutating the original
  const targetDocumentCopy = JSON.parse(JSON.stringify(targetDocument));

  if (typeof targetDocumentCopy !== 'object' || targetDocumentCopy === null) {
    // Return the document as is if it's not a valid object
    return targetDocumentCopy;
  }

  mediaObjectsToCopy.forEach((mediaObj) => {
    const xpathValue = mediaObj.xPath;
    if (!xpathValue) {
      return; // Skip if xPath is not provided
    }
    const pathSegments = xpathValue
      .split('/')
      .filter((segment) => segment !== '');

    if (pathSegments.length === 0) {
      return; // Skip if xPath is invalid
    }

    const mediaField = pathSegments.pop();
    if (!mediaField) {
      return; // Skip if xPath does not contain a media field
    }

    let current: any = targetDocumentCopy;

    for (const segment of pathSegments) {
      if (current === undefined || current === null) {
        return; // Skip if path segment does not exist
      }

      // Check if the segment is an array index
      const arrayMatch = segment.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const arrayKey = arrayMatch[1];
        const index = parseInt(arrayMatch[2], 10);

        if (!Array.isArray(current[arrayKey])) {
          return; // Skip if expected array is not found
        }

        current = current[arrayKey][index];
      } else {
        current = current[segment];
      }
    }

    if (current && typeof current === 'object') {
      if (current._key === mediaObj.parentId) {
        if (mediaField in current) {
          current[mediaField] = mediaObj.value; // Replace media field with new value
        }
      }
    }
  });

  return targetDocumentCopy;
}

export class TranslationService {
  private client: SanityClient;
  private previewClient?: SanityClient;
  private deeplApiKey: string;
  private translatableFieldKeys: (string | { type: string[]; key: string })[];
  private translatableArrayFieldKeys: string[];

  constructor(config: TranslationServiceOptions) {
    this.client = config.client;
    this.previewClient = config.previewClient;
    this.deeplApiKey = config.deeplApiKey;

    // Initialize field keys using the configuration
    this.translatableFieldKeys = getMergedTranslatableFieldKeys(
      config.fieldKeyConfig,
    );
    this.translatableArrayFieldKeys = getMergedTranslatableArrayFieldKeys(
      config.fieldKeyConfig,
    );
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
      const originalDocumentCopy = JSON.parse(JSON.stringify(originalDocument));

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
          originalDocumentCopy, // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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
          this.translatableFieldKeys,
          this.translatableArrayFieldKeys,
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
      return { isTranslated: false, message: 'No document ID or type found' };
    }

    // Load the document data from the server
    const document = await loadDocumentData(docId, type, this.client);
    if (!document) {
      return { isTranslated: false, message: 'No document data found' };
    }

    // Extract the language from the document data
    let language = document.language;
    if (!language) {
      return { isTranslated: false, message: 'No language found' };
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
      this.translatableFieldKeys,
      this.translatableArrayFieldKeys,
    );

    await this.client
      .patch(translatedJsonData._id)
      .set({ ...translatedJsonData })
      .commit();

    return { isTranslated: true, translatedJsonData };
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
