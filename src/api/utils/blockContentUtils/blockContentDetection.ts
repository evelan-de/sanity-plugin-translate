/**
 * Utilities for detecting and analyzing Sanity block content
 */
import { BLOCK_CONTENT_TYPE, SPAN_TYPE } from './blockContentTypes';

/**
 * Detects if an array is Sanity block content by checking its structure.
 * @param array The array to check
 * @returns True if the array appears to be Sanity block content
 */
export const isBlockContent = (array: any[]): boolean => {
  // Check if the array is empty
  if (!array || !Array.isArray(array) || array.length === 0) {
    return false;
  }

  // Check if at least one item is a block
  const hasBlock = array.some(
    (item) => item && item._type === BLOCK_CONTENT_TYPE,
  );
  if (!hasBlock) {
    return false;
  }

  // Check if at least one block has children with spans
  const hasSpans = array.some((item) => {
    if (
      item &&
      item._type === BLOCK_CONTENT_TYPE &&
      Array.isArray(item.children)
    ) {
      return item.children.some(
        (child: any) => child && child._type === SPAN_TYPE,
      );
    }
    return false;
  });

  return hasSpans;
};

/**
 * Helper function to check if a child is a valid span with text
 */
export const isValidSpan = (child: any): boolean => {
  return child && child._type === SPAN_TYPE && typeof child.text === 'string';
};

/**
 * Check if a block should use HTML translation based on its complexity
 * @param block The block to check
 * @returns True if the block has marks, markDefs, or multiple children
 */
export const shouldUseHtmlForBlock = (block: any): boolean => {
  // Skip non-block types or blocks without children
  if (
    !block ||
    block._type !== BLOCK_CONTENT_TYPE ||
    !Array.isArray(block.children)
  ) {
    return false;
  }

  // Check if any child has marks
  const hasMarks = block.children.some(
    (child: any) => child.marks && child.marks.length > 0,
  );

  // Check if the block has markDefs
  const hasMarkDefs = block.markDefs && block.markDefs.length > 0;

  // Check if the block has multiple children (might need to preserve structure)
  const hasMultipleChildren = block.children.length > 1;

  // Use HTML if any complexity is detected
  return hasMarks || hasMarkDefs || hasMultipleChildren;
};
