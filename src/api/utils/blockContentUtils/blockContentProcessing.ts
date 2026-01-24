/**
 * Main processing functions for Sanity block content translation
 */
import { uuid } from '@sanity/uuid';

import {
  blockContentMap,
  findContextForHeaderBlock,
} from './blockContentContext';
import {
  isBlockContent,
  isValidSpan,
  shouldUseHtmlForBlock,
} from './blockContentDetection';
import {
  convertBlockToHtml,
  parseHtmlToBlockStructure,
} from './blockContentHtml';
import {
  ApplyBlockContentTranslationsParams,
  BLOCK_CONTENT_TYPE,
  BlockInfo,
  HEADER_STYLES,
  ProcessNestedBlockContentParams,
  SPAN_TYPE,
} from './blockContentTypes';

/**
 * Recursively process nested object fields within custom block types
 * to find translatable string fields at any depth
 */
const processNestedObjectFields = (
  obj: Record<string, any>,
  basePath: string,
  fieldsToTranslate: {
    key: string;
    value: string;
    context?: string;
    isHtml?: boolean;
  }[],
  translatableFieldKeys: (string | { type: string[]; key: string })[],
): void => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
  const objType = obj._type || '';

  Object.entries(obj).forEach(([key, value]) => {
    if (key.startsWith('_')) return;

    if (typeof value === 'string' && value.trim() !== '') {
      const fieldDef = translatableFieldKeys.find((f) =>
        typeof f === 'object' ? f.key === key : f === key,
      );
      if (
        fieldDef &&
        (typeof fieldDef === 'string' || fieldDef.type.includes(objType))
      ) {
        fieldsToTranslate.push({ key: `${basePath}.${key}`, value });
      }
    } else if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      processNestedObjectFields(
        value,
        `${basePath}.${key}`,
        fieldsToTranslate,
        translatableFieldKeys,
      );
    } else if (Array.isArray(value) && isBlockContent(value)) {
      // eslint-disable-next-line no-use-before-define
      processBlockContent(
        value,
        key,
        `${basePath}.${key}`,
        fieldsToTranslate,
        translatableFieldKeys,
      );
    }
  });
};

/**
 * Process custom block types that are not standard Sanity blocks
 */
const processCustomBlockType = (params: {
  block: any;
  blockIndex: number;
  nestedKey: string;
  nestedArrayPath: string;
  fieldsToTranslate: {
    key: string;
    value: string;
    context?: string;
    isHtml?: boolean;
  }[];
  translatableFieldKeys: (string | { type: string[]; key: string })[];
}): void => {
  const {
    block,
    blockIndex,
    nestedArrayPath,
    fieldsToTranslate,
    translatableFieldKeys,
  } = params;
  const blockType = block._type;

  // Process each field in the custom block
  Object.entries(block).forEach(([fieldKey, fieldValue]) => {
    // Skip system fields
    if (fieldKey.startsWith('_')) {
      return;
    }

    // Check if this field is translatable for this block type
    const fieldDefinition = translatableFieldKeys.find((f) =>
      typeof f === 'object' ? f.key === fieldKey : f === fieldKey,
    );

    if (fieldDefinition) {
      const isTranslatable =
        typeof fieldDefinition === 'string'
          ? true // Generic translatable field
          : fieldDefinition.type.includes(blockType);

      // Handle translatable string fields
      if (
        isTranslatable &&
        typeof fieldValue === 'string' &&
        fieldValue.trim() !== ''
      ) {
        const uniqueFieldKey = `${nestedArrayPath}.${blockIndex}.${fieldKey}`;
        fieldsToTranslate.push({ key: uniqueFieldKey, value: fieldValue });
      }
    }

    // Handle nested block content arrays within custom blocks
    if (Array.isArray(fieldValue) && isBlockContent(fieldValue)) {
      // Process the nested block content array directly
      const customBlockArrayPath = `${nestedArrayPath}.${blockIndex}.${fieldKey}`;

      // Process each block in the content array
      fieldValue.forEach((contentBlock: any, contentBlockIndex: number) => {
        if (
          contentBlock._type === BLOCK_CONTENT_TYPE &&
          Array.isArray(contentBlock.children)
        ) {
          contentBlock.children.forEach((child: any) => {
            if (
              child._type === SPAN_TYPE &&
              typeof child.text === 'string' &&
              child.text.trim() !== ''
            ) {
              // Generate a unique key for this span
              const key = uuid();

              // Add to fields to translate
              fieldsToTranslate.push({
                key,
                value: child.text,
              });

              // Store mapping information
              blockContentMap.set(key, {
                fieldName: fieldKey,
                blockIndex: contentBlockIndex,
                arrayPath: customBlockArrayPath,
                isHeader: false,
              });
            }
          });
        }
      });
    }

    // Handle nested object fields within custom blocks
    if (
      typeof fieldValue === 'object' &&
      fieldValue !== null &&
      !Array.isArray(fieldValue)
    ) {
      const nestedPath = `${nestedArrayPath}.${blockIndex}.${fieldKey}`;
      processNestedObjectFields(
        fieldValue,
        nestedPath,
        fieldsToTranslate,
        translatableFieldKeys,
      );
    }
  });
};

/**
 * Process a block content array and extract translatable content
 * @param nestedArray The block content array to process
 * @param nestedKey The key of the array in its parent object
 * @param nestedArrayPath The full path to the array
 * @param fieldsToTranslate Array to populate with fields to translate
 * @param translatableFieldKeys Optional array of translatable field keys for custom block processing
 */
export const processBlockContent = (
  nestedArray: any[],
  nestedKey: string,
  nestedArrayPath: string,
  fieldsToTranslate: {
    key: string;
    value: string;
    context?: string;
    isHtml?: boolean;
  }[],
  translatableFieldKeys?: (string | { type: string[]; key: string })[],
): void => {
  // Map to store information about each block for context lookup
  const blockContextMap = new Map<number, BlockInfo>();

  // First pass: collect information about each block
  nestedArray.forEach((block, blockIndex) => {
    if (block._type === BLOCK_CONTENT_TYPE) {
      const isHeader = HEADER_STYLES.includes(block.style || '');
      const isNormal = block.style === 'normal' || !block.style;

      // Extract text from all spans in the block
      let blockText = '';
      if (Array.isArray(block.children)) {
        blockText = block.children
          .filter((child: any) => isValidSpan(child))
          .map((child: any) => child.text)
          .join('');
      }

      // Store block info for context lookup
      blockContextMap.set(blockIndex, {
        text: blockText,
        isNormal,
        isHeader,
      });
    }
  });

  // Second pass: process each block with appropriate context
  nestedArray.forEach((block, blockIndex) => {
    if (block._type === BLOCK_CONTENT_TYPE) {
      const blockInfo = blockContextMap.get(blockIndex);
      if (!blockInfo) return;

      const { isHeader } = blockInfo;
      let context: string | undefined;

      // For header blocks, find context from the next normal block
      if (isHeader) {
        context = findContextForHeaderBlock(
          nestedArray,
          blockContextMap,
          blockIndex,
        );
      }

      // Check if this block needs HTML-based translation
      const shouldUseHtml = shouldUseHtmlForBlock(block);

      if (shouldUseHtml) {
        // Convert block to HTML for translation
        const html = convertBlockToHtml(block);

        // Generate a unique key for this block
        const key = uuid();

        // Add to fields to translate with HTML flag
        fieldsToTranslate.push({
          key,
          value: html,
          context,
          isHtml: true,
        });

        // Store mapping information
        blockContentMap.set(key, {
          fieldName: nestedKey,
          blockIndex,
          context,
          isHeader,
          arrayPath: nestedArrayPath,
          isHtml: true,
        });
      } else {
        // Process simple blocks (no marks/markDefs) using the original approach
        if (Array.isArray(block.children)) {
          block.children.forEach((child: any) => {
            if (isValidSpan(child)) {
              // Generate a unique key for this span
              const key = uuid();

              // Add to fields to translate
              fieldsToTranslate.push({
                key,
                value: child.text,
                context,
              });

              // Store mapping information
              blockContentMap.set(key, {
                fieldName: nestedKey,
                blockIndex,
                context,
                isHeader,
                arrayPath: nestedArrayPath,
              });
            }
          });
        }
      }
    } else if (block._type && translatableFieldKeys) {
      // Handle custom block types (like featureText)
      processCustomBlockType({
        block,
        blockIndex,
        nestedKey,
        nestedArrayPath,
        fieldsToTranslate,
        translatableFieldKeys,
      });
    }
  });
};

/**
 * Process an object to find and handle any nested block content arrays
 * @param params Parameters for the function
 */
export const processNestedBlockContent = (
  params: ProcessNestedBlockContentParams,
): void => {
  const { object, key, path, fieldsToTranslate, translatableFieldKeys } =
    params;

  // Skip null or undefined values
  if (object[key] === null || object[key] === undefined) {
    return;
  }

  const value = object[key];
  const currentPath = path ? `${path}.${key}` : key;

  // Check if this is an array of block content
  if (Array.isArray(value) && isBlockContent(value)) {
    // Process block content array with translatable field keys
    processBlockContent(
      value,
      key,
      currentPath,
      fieldsToTranslate,
      translatableFieldKeys,
    );
  } else if (typeof value === 'object' && value !== null) {
    // Recursively process nested objects
    const nestedObject = value as Record<string, unknown>;
    Object.keys(nestedObject).forEach((nestedKey) => {
      processNestedBlockContent({
        object: nestedObject,
        key: nestedKey,
        path: currentPath,
        fieldsToTranslate,
        translatableFieldKeys,
      });
    });
  }
};

/**
 * Apply translations to block content arrays using the blockContentMap
 * @param params Parameters for the function
 */
export const applyBlockContentTranslations = (
  params: ApplyBlockContentTranslationsParams,
): void => {
  const { value, key, currentArrayPath, translationMap } = params;

  // Skip if value is not an array
  if (!Array.isArray(value)) {
    return;
  }

  // Find all translations for this array path
  const relevantKeys = Array.from(blockContentMap.keys()).filter((mapKey) => {
    const item = blockContentMap.get(mapKey);
    return (
      item && item.arrayPath === currentArrayPath && item.fieldName === key
    );
  });

  // Group translations by block index
  const blockTranslations = new Map<number, string[]>();
  const blockHtmlTranslations = new Map<number, string>();

  relevantKeys.forEach((mapKey) => {
    const item = blockContentMap.get(mapKey);
    if (!item) return;

    const { blockIndex, isHtml } = item;
    const translation = translationMap.get(mapKey);

    if (translation !== undefined) {
      if (isHtml) {
        // Store HTML translation for the entire block
        blockHtmlTranslations.set(blockIndex, translation);
      } else {
        // Store individual span translations
        const translations = blockTranslations.get(blockIndex) || [];
        translations.push(translation);
        blockTranslations.set(blockIndex, translations);
      }
    }
  });

  // Apply translations to each block
  value.forEach((block: any, blockIndex: number) => {
    // Skip null or undefined blocks
    if (!block) return;

    // Skip blocks without a _type property
    if (typeof block !== 'object' || block._type !== BLOCK_CONTENT_TYPE) return;

    // Check if we have an HTML translation for this block
    if (blockHtmlTranslations.has(blockIndex)) {
      const translation = blockHtmlTranslations.get(blockIndex);
      if (translation) {
        // For HTML translations, parse the HTML back to block structure with preserved marks
        const updatedBlock = parseHtmlToBlockStructure(translation, block);

        // Replace the block's children with the parsed HTML structure
        value[blockIndex] = updatedBlock;
      }
    } else if (blockTranslations.has(blockIndex)) {
      // Apply individual span translations
      const translations = blockTranslations.get(blockIndex) || [];
      let translationIndex = 0;

      if (Array.isArray(block.children)) {
        block.children.forEach((child: any, childIndex: number) => {
          if (
            child &&
            isValidSpan(child) &&
            translationIndex < translations.length
          ) {
            // Replace the text with its translation
            block.children[childIndex].text = translations[translationIndex];
            translationIndex++;
          }
        });
      }
    }
  });
};
