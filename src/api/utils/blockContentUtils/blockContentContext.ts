/**
 * Context handling utilities for Sanity block content
 */
import { BlockInfo } from './blockContentTypes';

// Global map to track block content locations for translation
export const blockContentMap = new Map<
  string,
  {
    fieldName: string;
    blockIndex: number;
    context?: string;
    isHeader: boolean;
    arrayPath: string;
    isHtml?: boolean;
  }
>();

/**
 * Clear the block content map
 * Should be called at the start of each translation operation
 */
export const clearBlockContentMap = (): void => {
  blockContentMap.clear();
};

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
  // Look for the next normal block to use as context
  for (let i = blockIndex + 1; i < nestedArray.length; i++) {
    const blockInfo = blockContextMap.get(i);
    if (blockInfo && blockInfo.isNormal) {
      // Use the next normal block's text as context
      return blockInfo.text;
    }
  }

  // If no normal block found after this header, return undefined
  return undefined;
};
