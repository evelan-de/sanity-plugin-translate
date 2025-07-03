# Block Content Processing Documentation

## Overview

This document provides a comprehensive guide to the block content processing functionality in the Sanity plugin for translation. Block content is Sanity's rich text format, consisting of arrays of blocks (paragraphs, headings, etc.) that contain spans of text with various marks (bold, italic, etc.). The plugin processes these complex structures to provide high-quality translations while preserving formatting and structure.

## Table of Contents

1. [Block Content Structure](#block-content-structure)
2. [Architecture](#architecture)
3. [Key Components](#key-components)
4. [Process Flow](#process-flow)
5. [Header Context Enhancement](#header-context-enhancement)
6. [Translation Mapping](#translation-mapping)
7. [Utility Functions](#utility-functions)
8. [Integration with TranslationService](#integration-with-translationservice)
9. [Edge Cases and Solutions](#edge-cases-and-solutions)

## Block Content Structure

Sanity's block content is structured as follows:

```json
[
  {
    "_key": "a1b2c3",
    "_type": "block",
    "style": "normal",
    "children": [
      {
        "_key": "d4e5f6",
        "_type": "span",
        "marks": ["strong"],
        "text": "This is bold text"
      }
    ]
  },
  {
    "_key": "g7h8i9",
    "_type": "block",
    "style": "h2",
    "children": [
      {
        "_key": "j0k1l2",
        "_type": "span",
        "marks": [],
        "text": "This is a heading"
      }
    ]
  }
]
```

Key characteristics:

- Each block represents a paragraph, heading, or other content unit
- Blocks have a `style` property indicating their type (normal, h1, h2, etc.)
- Each block contains an array of `children`, typically spans
- Spans contain the actual text content and optional formatting marks

## Architecture

The block content processing functionality has been refactored into a dedicated utility module to improve maintainability and separation of concerns:

- **Location**: `src/api/utils/blockContentUtils.ts`
- **Integration**: Used by `TranslationService.ts` for processing block content

This architecture allows for:

- Centralized management of block content processing logic
- Easier testing and maintenance
- Clear separation between translation service and block content handling

## Key Components

### Constants

```typescript
// Block content type identifiers
export const BLOCK_CONTENT_TYPE = 'block';
export const SPAN_TYPE = 'span';

// Header styles for context enhancement
export const HEADER_STYLES = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

// Global map to track block content locations for translation
export const blockContentMap = new Map<string, BlockContentMapItem>();
```

### Interfaces

```typescript
// Information about a block's type and content
export interface BlockInfo {
  text: string;
  isNormal: boolean;
  isHeader: boolean;
}

// Mapping information for block content translation
export interface BlockContentMapItem {
  fieldName: string;
  blockIndex: number;
  context?: string;
  isHeader: boolean;
  arrayPath: string; // Path to the array containing this block
}
```

## Process Flow

The block content processing follows these main steps:

1. **Detection**: Identify arrays that contain Sanity block content
2. **Extraction**: Extract text from spans within each block
3. **Context Enhancement**: For header blocks, find and attach context from subsequent normal blocks
4. **Mapping**: Create a mapping between unique keys and block locations
5. **Translation**: Send extracted text for translation
6. **Application**: Apply translations back to the original structure

### Detailed Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Document       │────▶│  Block Content  │────▶│  Text           │
│  Traversal      │     │  Detection      │     │  Extraction     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Translation    │◀────│  Mapping        │◀────│  Context        │
│  Request        │     │  Creation       │     │  Enhancement    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │
        ▼
┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │
│  Translation    │────▶│  Apply          │
│  Response       │     │  Translations   │
│                 │     │                 │
└─────────────────┘     └─────────────────┘
```

## Header Context Enhancement

A key feature is providing context for header blocks to improve translation quality:

1. For each header block (h1, h2, h3, etc.), the system looks for the next "normal" block
2. If found, the normal block's text is used as context for translating the header
3. This context is passed to the translation API to provide semantic guidance

```typescript
// Example of context finding logic
export const findContextForHeaderBlock = (
  nestedArray: any[],
  blockContextMap: Map<number, BlockInfo>,
  blockIndex: number,
): string | undefined => {
  let nextBlockIndex = blockIndex + 1;
  while (nextBlockIndex < nestedArray.length) {
    const nextBlockInfo = blockContextMap.get(nextBlockIndex);
    if (nextBlockInfo?.isNormal) {
      return nextBlockInfo.text;
    }
    // Don't look past consecutive headers
    if (nextBlockInfo?.isHeader) {
      break;
    }
    nextBlockIndex++;
  }
  return undefined;
};
```

Key rules:

- Only use the immediately following normal block as context
- Don't look past consecutive headers
- If no suitable context is found, translate without context

## Translation Mapping

To ensure accurate translation application, the system uses a robust mapping strategy:

1. Each block gets a unique key based on its array path and index
2. This mapping is stored in the `blockContentMap` global Map
3. When translations are received, they are matched back to the original blocks using this map

This approach handles:

- Multiple block content arrays in the same document
- Nested block content arrays (e.g., within objects)
- Blocks with identical content but different locations

### Path Mapping Strategy in Detail

The path mapping strategy is a critical component that ensures translations are correctly applied to the right blocks, even when dealing with complex nested structures or duplicate content across different sections.

#### Key Generation

There are two types of keys used in the translation process:

1. **UUID-based keys**: Generated for block content items using `uuid()` function

   - Used for blocks within block content arrays
   - Ensures uniqueness across the entire document
   - Example: `'522fcf74-eb07-4286-ba91-46de96a6f310'`

2. **Path-based keys**: Used for regular fields outside block content
   - Format: `[path].[fieldName]`
   - Example: `'body.0.ctaLink.label'` (points to a label field in the first body section's CTA link)

#### Path Construction

Paths are constructed hierarchically to represent the exact location of each field in the document:

```typescript
// For a block within a block content array
const arrayPath = path ? `${path}.${key}` : key;

// For a nested field within an object
const currentPath = path ? `${path}.${key}` : key;
```

This creates paths like:

- `body.0.sectionTitle` (first section's title in the body array)
- `footerCTASection.primaryCta.label` (label in the footer CTA section)

#### Example from Real Data

Let's examine some real translation data to understand how the mapping works:

```javascript
// Block content items with UUID-based keys and context
{
  key: '522fcf74-eb07-4286-ba91-46de96a6f310',
  value: 'Wo individuelles Design auf grenzenlose Freiheit trifft',
  context: 'Beeindruckende Premium-Designs, die dein Unternehmen hervorstechen lassen.'
}

// Regular fields with path-based keys
{
  key: 'body.0.ctaLink.label',
  value: 'Klicken Sie hier, um die Homepage zu sehen'
}

// Translation map showing both key types
translationMap Map(47) {
  // UUID-based keys for block content
  '522fcf74-eb07-4286-ba91-46de96a6f310' => 'Where individual design meets boundless freedom',

  // Path-based keys for regular fields
  'body.0.ctaLink.label' => 'Click here to see the homepage',
  'footerCTASection.primaryCta.label' => 'Request an initial consultation'
}
```

#### Handling Duplicate Content

One of the challenges addressed by this mapping strategy is handling duplicate content that appears in multiple locations. For example, in the log data we can see:

```javascript
// Same content appears in multiple blocks with different keys
{
  key: '522fcf74-eb07-4286-ba91-46de96a6f310',
  value: 'Wo individuelles Design auf grenzenlose Freiheit trifft',
  context: '...'
},
{
  key: '0093a367-ef99-4d22-83f5-fa42a810cedc',
  value: 'Wo individuelles Design auf grenzenlose Freiheit trifft',
  context: '...'
}
```

Even though the content is identical, each instance gets a unique key based on its location in the document structure. This ensures that:

1. Each instance is translated independently
2. Translations are applied back to the correct location
3. Context is preserved for each instance

#### Block Content Map Structure

The `blockContentMap` maintains the relationship between the UUID keys and their locations:

```typescript
export interface BlockContentMapItem {
  fieldName: string; // The field name (e.g., 'text')
  blockIndex: number; // The index within the block content array
  context?: string; // Optional context for header blocks
  isHeader: boolean; // Whether this is a header block
  arrayPath: string; // Path to the array containing this block
}
```

This structure allows the system to find the exact location of each block when applying translations, even in deeply nested structures like:

```javascript
// From the log data - nested structure
footerCTASection: {
  _type: 'footerCta',
  description: [ [Object] ],
  primaryCta: {
    label: 'Request an initial consultation',
    subline: 'Non-binding and fast'
  },
  title: [ [Object] ]
}
```

## Utility Functions

### Core Processing Functions

#### `processBlockContent`

The main function that processes a block content array:

```typescript
export const processBlockContent = (
  nestedArray: any[],
  fieldName: string,
  arrayPath: string,
  fieldsToTranslate: { key: string; value: string; context?: string }[],
): void => {
  // Process each block in the array
  // Extract text, identify headers, find context, and populate fieldsToTranslate
};
```

#### `processNestedBlockContent`

Handles objects that might contain nested block content arrays:

```typescript
export const processNestedBlockContent = (
  params: ProcessNestedBlockContentParams,
) => {
  // Find and process any nested block content arrays within an object
};
```

#### `applyBlockContentTranslations`

Applies translations back to block content arrays:

```typescript
export const applyBlockContentTranslations = (
  params: ApplyBlockContentTranslationsParams,
): void => {
  // Apply translations to blocks using the blockContentMap
};
```

### Helper Functions

- `isBlockContent`: Detects if an array contains Sanity block content
- `isValidSpan`: Checks if an object is a valid span with text
- `applyTranslationToSpans`: Applies a translation to an array of spans
- `clearBlockContentMap`: Resets the global mapping at the start of each translation

## Integration with TranslationService

The TranslationService integrates with these utilities at two key points:

### 1. Field Mapping Phase

During the `mapFieldsToTranslate` function:

```typescript
// When a block content array is detected
if (Array.isArray(value) && isBlockContent(value)) {
  // Create the array path for this block content array
  const arrayPath = path ? `${path}.${key}` : key;

  // Process the block content array and populate fieldsToTranslate
  processBlockContent(value, key, arrayPath, fieldsToTranslate);
  return;
}

// For nested objects that might contain block content
if (typeof value === 'object') {
  // Use the utility function to process any nested block content arrays
  processNestedBlockContent({
    object: value as Record<string, unknown>,
    key,
    path,
    fieldsToTranslate,
  });

  // Continue with regular object processing...
}
```

### 2. Translation Application Phase

During the `replaceTranslations` function:

```typescript
// When processing arrays that might be block content
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
```

## Edge Cases and Solutions

### Multiple Block Content Arrays

**Challenge**: Documents with multiple block content arrays (e.g., body, footer, sidebar)  
**Solution**: Use array paths to distinguish between arrays with the same field name

### Nested Block Content Arrays

**Challenge**: Block content arrays nested within objects  
**Solution**: The `processNestedBlockContent` function recursively finds and processes these arrays

### Translation Alignment

**Challenge**: Ensuring translations are applied to the correct blocks  
**Solution**: Use unique keys based on array paths and block indices, not Sanity's `_key` values which differ between language versions

### Header Context

**Challenge**: Providing appropriate context for headers  
**Solution**: Strict rules for context assignment (only use the next normal block, don't skip headers)

### Batch Processing

**Challenge**: Processing translations in batches while maintaining context  
**Solution**: Use a translation map keyed by unique field keys instead of relying on array indices

## Conclusion

The block content processing system provides robust handling of Sanity's rich text format during translation. By separating this logic into dedicated utilities, the code is more maintainable and easier to understand. The system handles complex nested structures, preserves formatting, and enhances translation quality through contextual information.
