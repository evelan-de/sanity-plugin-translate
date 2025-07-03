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
} from './blockContentTypes';

/**
 * Process a block content array and extract translatable content
 * @param nestedArray The block content array to process
 * @param nestedKey The key of the array in its parent object
 * @param nestedArrayPath The full path to the array
 * @param fieldsToTranslate Array to populate with fields to translate
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
  const { object, key, path, fieldsToTranslate } = params;

  // Skip null or undefined values
  if (object[key] === null || object[key] === undefined) {
    return;
  }

  const value = object[key];
  const currentPath = path ? `${path}.${key}` : key;

  // Check if this is an array of block content
  if (Array.isArray(value) && isBlockContent(value)) {
    // Process block content array
    processBlockContent(value, key, currentPath, fieldsToTranslate);
  } else if (typeof value === 'object' && value !== null) {
    // Recursively process nested objects
    const nestedObject = value as Record<string, unknown>;
    Object.keys(nestedObject).forEach((nestedKey) => {
      processNestedBlockContent({
        object: nestedObject,
        key: nestedKey,
        path: currentPath,
        fieldsToTranslate,
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
  // fieldsToTranslate is available in params but not used in this function

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
    if (block._type !== BLOCK_CONTENT_TYPE) return;

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
          if (isValidSpan(child) && translationIndex < translations.length) {
            // Replace the text with its translation
            block.children[childIndex].text = translations[translationIndex];
            translationIndex++;
          }
        });
      }
    }
  });
};
