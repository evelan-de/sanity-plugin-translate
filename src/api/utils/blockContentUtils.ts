/**
 * Block content utility functions for Sanity translation
 * This file contains utilities for processing Sanity block content during translation
 */
import { uuid } from '@sanity/uuid';

// Constants for Sanity block types
export const BLOCK_CONTENT_TYPE = 'block';
export const SPAN_TYPE = 'span';
export const HEADER_STYLES = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

// Types for block content processing
export interface BlockInfo {
  text: string;
  isNormal: boolean;
  isHeader: boolean;
}

export interface BlockContentMapItem {
  fieldName: string;
  blockIndex: number;
  context?: string;
  isHeader: boolean;
  arrayPath: string; // Path to the array containing this block
}

// Global map to track block content locations for translation
export const blockContentMap = new Map<string, BlockContentMapItem>();

/**
 * Helper function to find context for header blocks
 * @param nestedArray The array of blocks to process
 * @param blockContextMap Map containing information about each block
 * @param blockIndex Index of the current header block
 * @returns The context text from the next normal block, or undefined if none found
 */
export const findContextForHeaderBlock = (
  nestedArray: any[],
  blockContextMap: Map<number, BlockInfo>,
  blockIndex: number,
): string | undefined => {
  let nextBlockIndex = blockIndex + 1;
  while (nextBlockIndex < nestedArray.length) {
    const nextBlockInfo = blockContextMap.get(nextBlockIndex);
    if (nextBlockInfo && nextBlockInfo.isNormal) {
      return nextBlockInfo.text;
    } else if (nextBlockInfo && nextBlockInfo.isHeader) {
      // If we encounter another header, stop looking for context
      break;
    }
    nextBlockIndex++;
  }
  return undefined;
};

/**
 * Detects if an array is Sanity block content by checking its structure.
 * @param array The array to check
 * @returns True if the array appears to be Sanity block content
 */
export const isBlockContent = (array: any[]): boolean => {
  // Empty arrays are not block content
  if (!array || array.length === 0) {
    return false;
  }

  // Check if at least one item has the expected block content structure
  return array.some(
    (item) =>
      item &&
      typeof item === 'object' &&
      item._type === BLOCK_CONTENT_TYPE &&
      Array.isArray(item.children) &&
      item.children.some(
        (child: any) => child && child._type === SPAN_TYPE && 'text' in child,
      ),
  );
};

/**
 * Applies a translation to a block's spans
 * @param textSpans Array of span objects with text property
 * @param translation The translated text to apply
 */
export const applyTranslationToSpans = (
  textSpans: any[],
  translation: string,
): void => {
  if (textSpans.length === 1) {
    // If there's only one span, replace its text directly and preserve marks
    textSpans[0].text = translation;
    // No need to modify marks for single spans
  } else if (textSpans.length > 1) {
    // If there are multiple spans, put all text in the first span, empty the others, and remove all marks
    textSpans[0].text = translation;
    // Remove all marks from the first span
    textSpans[0].marks = [];

    // Empty all other spans
    for (let i = 1; i < textSpans.length; i++) {
      textSpans[i].text = '';
      textSpans[i].marks = [];
    }
  }
};

/**
 * Helper function to check if a child is a valid span with text
 */
export const isValidSpan = (child: any): boolean => {
  return child._type === SPAN_TYPE && typeof child.text === 'string';
};

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
  fieldsToTranslate: { key: string; value: string; context?: string }[],
): void => {
  // First pass: identify headers and normal blocks
  const blockContextMap = new Map<number, BlockInfo>();

  // Process blocks to identify headers and normal blocks
  nestedArray.forEach((block, blockIndex) => {
    if (block._type === BLOCK_CONTENT_TYPE && Array.isArray(block.children)) {
      // Extract text using separate steps to reduce nesting
      const validChildren = block.children.filter(isValidSpan);
      const textParts = validChildren.map((span: any) => span.text);
      const joinedText = textParts.join('');

      // Store the block info for context assignment in the second pass
      blockContextMap.set(blockIndex, {
        text: joinedText,
        isNormal: block.style === 'normal',
        isHeader: HEADER_STYLES.includes(block.style),
      });
    }
  });

  // Second pass: process blocks with context for headers
  nestedArray.forEach((block, blockIndex) => {
    if (block._type === BLOCK_CONTENT_TYPE && Array.isArray(block.children)) {
      // Extract text using separate steps to reduce nesting
      const validChildren = block.children.filter(isValidSpan);
      const textParts = validChildren.map((span: any) => span.text);
      const joinedText = textParts.join('');

      if (joinedText.trim()) {
        // Generate a unique key for this block
        const uniqueKey = uuid();

        // Check if this is a header and if the next block is a normal block (for context)
        let context;
        const blockInfo = blockContextMap.get(blockIndex);

        if (blockInfo && blockInfo.isHeader) {
          // Find context using a separate helper function to reduce nesting
          context = findContextForHeaderBlock(
            nestedArray,
            blockContextMap,
            blockIndex,
          );

          // Add to the block content map for later replacement
          blockContentMap.set(uniqueKey, {
            fieldName: nestedKey,
            blockIndex,
            context,
            isHeader: true,
            arrayPath: nestedArrayPath,
          });

          // Add to fields to translate with context
          fieldsToTranslate.push({
            key: uniqueKey,
            value: joinedText,
            context,
          });
        } else {
          // For non-header blocks, just add them normally
          blockContentMap.set(uniqueKey, {
            fieldName: nestedKey,
            blockIndex,
            isHeader: false,
            arrayPath: nestedArrayPath,
          });

          // Add to fields to translate without context
          fieldsToTranslate.push({
            key: uniqueKey,
            value: joinedText,
          });
        }
      }
    }
  });
};

/**
 * Clear the block content map
 * Should be called at the start of each translation operation
 */
export const clearBlockContentMap = (): void => {
  blockContentMap.clear();
};

/**
 * Parameters for applyBlockContentTranslations function
 */
export interface ApplyBlockContentTranslationsParams {
  /** The block content array to update */
  value: any[];
  /** The key of the array in its parent object */
  key: string;
  /** The full path to the array */
  currentArrayPath: string;
  /** Map of translations keyed by unique block keys */
  translationMap: Map<string, string>;
  /** Original fields that were sent for translation */
  fieldsToTranslate: { key: string; value: string; context?: string }[];
  /** Translated text (fallback if translationMap doesn't have the key) */
  batchedTranslations: string[];
}

/**
 * Apply translations to block content arrays using the blockContentMap
 * @param params Parameters for the function
 */
/**
 * Parameters for processNestedBlockContent function
 */
export interface ProcessNestedBlockContentParams {
  /** The object that might contain nested block content arrays */
  object: Record<string, unknown>;
  /** The key of the object in its parent */
  key: string;
  /** The current path to the object */
  path: string | undefined;
  /** Array to collect translatable fields */
  fieldsToTranslate: { key: string; value: string; context?: string }[];
}

/**
 * Process an object to find and handle any nested block content arrays
 * @param params Parameters for the function
 */
export const processNestedBlockContent = (
  params: ProcessNestedBlockContentParams,
) => {
  const { object, key, path, fieldsToTranslate } = params;

  // Build the current path for this nested object
  const currentPath = path ? `${path}.${key}` : key;

  // Check if this is an object with nested block content arrays
  if (object !== null && typeof object === 'object' && !Array.isArray(object)) {
    // Extract nested block content arrays to reduce nesting level
    const nestedBlockArrays = Object.entries(object).filter(
      ([, val]) => Array.isArray(val) && isBlockContent(val as any[]),
    );

    // Process each nested block content array
    if (nestedBlockArrays.length > 0) {
      nestedBlockArrays.forEach(([nestedKey, nestedValue]) => {
        // Process this nested block content array with its full path
        const nestedArrayPath = currentPath
          ? `${currentPath}.${nestedKey}`
          : nestedKey;

        // Process the block content array
        processBlockContent(
          nestedValue as any[],
          nestedKey,
          nestedArrayPath,
          fieldsToTranslate,
        );
      });
    }
  }
};

export const applyBlockContentTranslations = (
  params: ApplyBlockContentTranslationsParams,
): void => {
  const {
    value,
    key,
    currentArrayPath,
    translationMap,
    fieldsToTranslate,
    batchedTranslations,
  } = params;

  // Check if this array has any blocks that were joined for translation
  blockContentMap.forEach((blockLocation, uniqueKey) => {
    // Match blocks by both field name and array path to handle multiple block content arrays
    if (
      blockLocation.fieldName === key &&
      blockLocation.arrayPath === currentArrayPath
    ) {
      // Get the translation from the map if available, otherwise fall back to array index
      let translation;
      if (translationMap && translationMap.has(uniqueKey)) {
        translation = translationMap.get(uniqueKey);
      } else {
        const translatedFieldIndex = fieldsToTranslate.findIndex(
          (f: { key: string }) => f.key === uniqueKey,
        );
        translation =
          translatedFieldIndex !== -1
            ? batchedTranslations[translatedFieldIndex]
            : null;
      }

      if (translation) {
        const { blockIndex } = blockLocation;

        // Make sure the block exists
        if (
          value[blockIndex] &&
          value[blockIndex]._type === BLOCK_CONTENT_TYPE &&
          Array.isArray(value[blockIndex].children)
        ) {
          const block = value[blockIndex];

          // Get all spans that have text
          const textSpans = block.children.filter(
            (child: any) =>
              child._type === SPAN_TYPE && typeof child.text === 'string',
          );

          // Apply the translation to the spans
          applyTranslationToSpans(textSpans, translation);
        }
      }
    }
  });
};
