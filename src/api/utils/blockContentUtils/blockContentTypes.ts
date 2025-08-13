/**
 * Type definitions and constants for Sanity block content processing
 */

// Constants for Sanity block types
export const BLOCK_CONTENT_TYPE = 'block';
export const SPAN_TYPE = 'span';
export const HEADER_STYLES = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

// Map HTML tags to Sanity marks for HTML conversion
export const HTML_TO_MARK_MAP: { [key: string]: string } = {
  strong: 'strong',
  b: 'strong',
  em: 'em',
  i: 'em',
  u: 'underline',
  s: 'strike-through',
  code: 'code',
  primary: 'primary',
  secondary: 'secondary',
};

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
  isHtml?: boolean; // Whether this block uses HTML translation
}

// Parameters for applyBlockContentTranslations function
export interface ApplyBlockContentTranslationsParams {
  value: any[];
  key: string;
  currentArrayPath: string;
  translationMap: Map<string, string>;
  fieldsToTranslate: {
    key: string;
    value: string;
    context?: string;
    isHtml?: boolean;
  }[];
  batchedTranslations?: string[];
}

// Parameters for processNestedBlockContent function
export interface ProcessNestedBlockContentParams {
  object: Record<string, unknown>;
  key: string;
  path: string | undefined;
  fieldsToTranslate: {
    key: string;
    value: string;
    context?: string;
    isHtml?: boolean;
  }[];
  translatableFieldKeys?: (string | { type: string[]; key: string })[];
}

// Segment type for HTML parsing
export interface TextSegment {
  text: string;
  marks: string[];
  startIndex: number;
  endIndex: number;
}
