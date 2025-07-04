# Block Content Processing Documentation

## Overview

This document provides a comprehensive guide to the block content processing functionality in the Sanity plugin for translation. Block content is Sanity's rich text format, consisting of arrays of blocks (paragraphs, headings, etc.) that contain spans of text with various marks (bold, italic, etc.) and markDefs (links, references). The plugin processes these complex structures to provide high-quality translations while preserving formatting, structure, and interactive elements.

## Table of Contents

1. [Block Content Structure](#block-content-structure)
2. [Modular Architecture](#modular-architecture)
3. [Key Components](#key-components)
4. [Process Flow](#process-flow)
5. [HTML-Based Translation](#html-based-translation)
6. [Header Context Enhancement](#header-context-enhancement)
7. [Translation Mapping](#translation-mapping)
8. [Utility Functions](#utility-functions)
9. [Integration with TranslationService](#integration-with-translationservice)
10. [Edge Cases and Solutions](#edge-cases-and-solutions)
11. [Performance Considerations](#performance-considerations)

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

## Modular Architecture

The block content processing functionality has been refactored into a modular architecture to improve maintainability, readability, and separation of concerns. The original monolithic `blockContentUtils.ts` file has been split into multiple focused modules within a dedicated folder structure:

- **Location**: `src/api/utils/blockContentUtils/`
- **Integration**: Used by `TranslationService.ts` for processing block content

### Module Structure

```
src/api/utils/blockContentUtils/
├── index.ts                   # Barrel file for re-exports
├── blockContentTypes.ts       # Type definitions and constants
├── blockContentDetection.ts   # Detection utilities
├── blockContentContext.ts     # Context handling utilities
├── blockContentHtml.ts        # HTML conversion and parsing utilities
└── blockContentProcessing.ts  # Main processing functions
```

### Module Responsibilities

1. **blockContentTypes.ts**
   - Type definitions for block content structures
   - Constants used across the block content processing system
   - Interface definitions for mapping and processing

2. **blockContentDetection.ts**
   - Utilities for detecting block content arrays
   - Functions to identify complex blocks requiring HTML-based translation
   - Validation utilities for spans and other block content elements

3. **blockContentContext.ts**
   - Global map for tracking block content locations
   - Context finding utilities for header blocks
   - State management for block content processing

4. **blockContentHtml.ts**
   - HTML conversion utilities using `@portabletext/to-html`
   - HTML parsing utilities using `htmlparser2`
   - Mark and markDef preservation logic

5. **blockContentProcessing.ts**
   - Main processing functions for block content arrays
   - Translation application logic
   - Integration with the translation workflow

6. **index.ts**
   - Re-exports all public functions and types
   - Provides a clean API for external consumers

This modular architecture provides several benefits:

- **Enhanced Maintainability**: Smaller, focused files with clear responsibilities
- **Better Organization**: Related functions grouped together
- **Improved Type Safety**: Consistent type definitions across modules
- **Easier Testing**: Isolated components can be tested independently
- **Better Collaboration**: Multiple developers can work on different modules
- **Clearer Dependencies**: Explicit imports show relationships between modules

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
2. **Complexity Analysis**: Determine if blocks need HTML-based translation
3. **Extraction**: Extract text from spans within each block (or convert to HTML for complex blocks)
4. **Context Enhancement**: For header blocks, find and attach context from subsequent normal blocks
5. **Mapping**: Create a mapping between unique keys and block locations
6. **Translation**: Send extracted text (or HTML) for translation
7. **Application**: Apply translations back to the original structure (parsing HTML back to blocks if needed)

### Detailed Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Document       │───▶│  Block Content  │────▶│  Complexity     │
│  Traversal      │     │  Detection      │     │  Analysis       │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐                           ┌─────────────────┐
│                 │                           │                 │
│  Simple Block   │◀─────────────────────────│  Decision       │
│  Processing     │                           │  Branch         │
│                 │                           │                 │
└─────────────────┘                           └─────────────────┘
        │                                             │
        │                                             ▼
        │                                     ┌─────────────────┐
        │                                     │                 │
        │                                     │  Complex Block  │
        │                                     │  Processing     │
        │                                     │                 │
        │                                     └─────────────────┘
        │                                             │
        ▼                                             ▼
┌─────────────────┐                           ┌─────────────────┐
│                 │                           │                 │
│  Text           │                           │  HTML           │
│  Extraction     │                           │  Conversion     │
│                 │                           │                 │
└─────────────────┘                           └─────────────────┘
        │                                             ▼
┌─────────────────┐                           ┌─────────────────┐
│                 │                           │                 │
│  Context        │                           │  HTML Field     │
│  Enhancement    │                           │  Flagging       │
│                 │                           │                 │
└─────────────────┘                           └─────────────────┘
        │                                             │
        ▼                                             ▼
┌─────────────────┐                           ┌─────────────────┐
│                 │                           │                 │
│  Mapping        │◀─────────────────────────│  Combined       │
│  Creation       │                           │  Mapping        │
│                 │                           │                 │
└─────────────────┘                           └─────────────────┘
        │
        ▼
┌─────────────────┐
│                 │
│  Translation    │
│  Request        │
│                 │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│                 │
│  Translation    │
│  Response       │
│                 │
└─────────────────┘
        │
        ▼
┌─────────────────┐                           ┌─────────────────┐
│                 │                           │                 │
│  Apply Text     │◀─────────────────────────│  Response        │
│  Translations   │                           │  Analysis       │────┐
│                 │                           │                 │    │
└─────────────────┘                           └─────────────────┘    │
                                                      │             │
                                                      ▼             │
                                              ┌─────────────────┐   │
                                              │                 │   │
                                              │  HTML           │   │
                                              │  Parsing        │   │
                                              │                 │   │
                                              └─────────────────┘   │
                                                      │             │
                                                      ▼             │
                                              ┌─────────────────┐   │
                                              │                 │   │
                                              │  Apply HTML     │◀──┘
                                              │  Translations   │
                                              │                 │
                                              └─────────────────┘
```

## HTML-Based Translation

A key innovation in the block content processing system is the HTML-based translation approach, which preserves marks, markDefs, and structure during translation. This approach was implemented to solve the challenge of preserving formatting and links when translating rich text content.

### Why HTML-Based Translation?

Traditional text-based translation approaches have limitations when dealing with rich text:

1. **Loss of Formatting**: When extracting plain text for translation, formatting information (bold, italic, etc.) is lost
2. **Link Disruption**: References to markDefs (links, references) are disconnected from their text
3. **Structure Changes**: Translation can change word order and sentence structure, making it difficult to reapply marks

HTML-based translation solves these problems by:

1. **Preserving Structure**: HTML tags maintain the structure during translation
2. **DeepL Support**: DeepL API supports HTML translation via `tag_handling=html` parameter
3. **Comprehensive Preservation**: All marks, markDefs, and structural elements are maintained

### Detection of Complex Blocks

Not all blocks need HTML-based translation. The system uses smart detection to identify blocks that require this approach:

```typescript
export const shouldUseHtmlForBlock = (block: any): boolean => {
  // Check if the block has markDefs
  if (block.markDefs && block.markDefs.length > 0) {
    return true;
  }

  // Check if any children have marks
  if (block.children && Array.isArray(block.children)) {
    for (const child of block.children) {
      if (child.marks && Array.isArray(child.marks) && child.marks.length > 0) {
        return true;
      }
    }

    // Check if there are multiple children with text
    const textChildren = block.children.filter(
      (child: any) =>
        child && child._type === SPAN_TYPE && typeof child.text === 'string',
    );
    if (textChildren.length > 1) {
      return true;
    }
  }

  return false;
};
```

This function checks for:
- Presence of markDefs (links, references)
- Children with marks (formatting)
- Multiple text children (complex structure)

### HTML Conversion Process

The HTML conversion process uses `@portabletext/to-html` with custom components to convert Sanity blocks to HTML while preserving all necessary information:

```typescript
export const convertBlockToHtml = (block: any): string => {
  try {
    // Custom components for HTML serialization
    const components = {
      // Custom mark handling
      marks: {
        // Standard marks (bold, italic, etc.)
        strong: ({ children }: any) => `<strong>${children}</strong>`,
        em: ({ children }: any) => `<em>${children}</em>`,
        // Custom marks with data attributes
        customMark: ({ children, markType }: any) =>
          `<span data-mark="${markType}">${children}</span>`,
        // Link handling with data attributes for markDefs
        link: ({ children, value }: any) => {
          return `<a data-link-type="${value._type}" data-link-key="${value._key}">${children}</a>`;
        },
      },
      // List handling with custom styles
      list: {
        bullet: ({ children }: any) => `<ul>${children}</ul>`,
        number: ({ children }: any) => `<ol>${children}</ol>`,
        checkBullet: ({ children }: any) => `<ul data-list-type="checkBullet">${children}</ul>`,
      },
    };

    // Convert block to HTML
    const html = toHTML([block], { components });
    return html;
  } catch (error) {
    // Fallback to plain text extraction
    console.error('Failed to convert block to HTML, falling back to text extraction:', error);
    const validChildren = block.children?.filter(
      (child: any) => child && child._type === SPAN_TYPE && typeof child.text === 'string',
    ) || [];
    const textParts = validChildren.map((span: any) => span.text);
    return textParts.join('');
  }
};
```

### HTML Parsing with htmlparser2

After translation, the HTML needs to be parsed back into Sanity block structure. This is done using `htmlparser2`, a robust HTML parsing library, which replaced the previous regex-based approach:

```typescript
export const parseHtmlToBlockStructure = (html: string, originalBlock: any): any => {
  try {
    // Create a new block based on the original
    const newBlock = {
      ...originalBlock,
      children: [],
    };

    // Parse HTML to spans using htmlparser2
    const spans = parseHtmlToSpans(html);
    
    // Add spans to the new block
    newBlock.children = spans;
    
    return newBlock;
  } catch (error) {
    console.error('Failed to parse HTML to block structure:', error);
    // Fallback: create a simple span with the HTML content
    return {
      ...originalBlock,
      children: [
        {
          _type: SPAN_TYPE,
          _key: uuid(),
          text: html,
          marks: [],
        },
      ],
    };
  }
};
```

### HTML to Spans Parsing

The core of the HTML parsing is the `parseHtmlToSpans` function, which uses `htmlparser2` to convert HTML back to Sanity spans with marks:

```typescript
export const parseHtmlToSpans = (html: string): any[] => {
  // Store the spans we'll create
  const spans: any[] = [];

  // Track current text and marks
  let currentText = '';
  const currentMarks: string[] = [];

  // Function to create a span with the current text and marks
  const createSpan = () => {
    if (currentText.trim()) {
      spans.push({
        _type: SPAN_TYPE,
        _key: uuid(),
        text: currentText,
        marks: [...currentMarks], // Create a copy to avoid reference issues
      });
    }
    currentText = '';
  };

  // Create parser instance
  const parser = new htmlparser2.Parser(
    {
      onopentag(name, attributes) {
        // If we have accumulated text, create a span before changing marks
        if (currentText) {
          createSpan();
        }

        // Add mark based on tag type
        if (name === 'a' && attributes['data-markdef-key']) {
          currentMarks.push(attributes['data-markdef-key']);
        } else if (name === 'span' && attributes['data-mark']) {
          currentMarks.push(attributes['data-mark']);
        } else if (HTML_TO_MARK_MAP[name]) {
          currentMarks.push(HTML_TO_MARK_MAP[name]);
        }
      },
      ontext(text) {
        // Add text to current accumulation
        currentText += text;
      },
      onclosetag(name) {
        // Create a span with the accumulated text
        createSpan();

        // Remove the mark associated with this tag
        if (name === 'a' || name === 'span' || HTML_TO_MARK_MAP[name]) {
          // Find the mark to remove
          let markToRemove: string | undefined;

          if (name === 'a') {
            // Find any markDef key in the marks array
            markToRemove = currentMarks.find(
              (mark) =>
                !Object.values(HTML_TO_MARK_MAP).includes(mark) &&
                !mark.startsWith('primary') &&
                !mark.startsWith('secondary'),
            );
          } else if (name === 'span') {
            // Find any custom mark (primary/secondary)
            markToRemove = currentMarks.find(
              (mark) => mark === 'primary' || mark === 'secondary',
            );
          } else if (HTML_TO_MARK_MAP[name]) {
            // Find the standard HTML mark
            markToRemove = HTML_TO_MARK_MAP[name];
          }

          if (markToRemove) {
            const index = currentMarks.indexOf(markToRemove);
            if (index !== -1) {
              currentMarks.splice(index, 1);
            }
          }
        }
      },
    },
    { decodeEntities: true },
  );

  // Parse the HTML
  parser.write(html);
  parser.end();

  // Create the final span if there's any remaining text
  if (currentText) {
    createSpan();
  }

  // Merge consecutive spans with the same marks
  return spans
    .filter((span) => span.text.trim())
    .reduce((merged: any[], current: any) => {
      if (merged.length === 0) {
        return [current];
      }

      const previous = merged[merged.length - 1];
      const haveSameMarks =
        JSON.stringify(previous.marks) === JSON.stringify(current.marks);

      if (haveSameMarks) {
        previous.text += current.text;
        return merged;
      }

      return [...merged, current];
    }, []);
};
```

### Benefits of htmlparser2 over Regex

The switch from regex-based parsing to `htmlparser2` provides several benefits:

1. **Robustness**: Properly handles nested HTML structures and edge cases
2. **Maintainability**: More readable and maintainable code
3. **Correctness**: Follows HTML parsing standards and handles malformed HTML gracefully
4. **Extensibility**: Easier to add support for new HTML elements or attributes
5. **Performance**: More efficient parsing for complex HTML structures

### Integration with Translation Flow

The HTML-based translation is integrated into the main processing flow:

1. During block content detection, blocks are analyzed for complexity
2. Complex blocks are converted to HTML using `convertBlockToHtml`
3. The HTML is flagged with `isHtml: true` in the fields to translate
4. When sending to DeepL, the `tag_handling=html` parameter is used for HTML fields
5. After translation, HTML is parsed back to block structure using `parseHtmlToBlockStructure`
6. The reconstructed blocks are applied back to the original document

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

The TranslationService integrates with the block content utilities at several key points:

### 1. Field Mapping Phase

During the `mapFieldsToTranslate` function, block content arrays are detected and processed:

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

### 2. Translation Request Phase

When sending translations to DeepL, the service checks for HTML fields and sets the appropriate parameters:

```typescript
// Group fields by whether they are HTML or not
const htmlFields = batchedTranslations.filter(field => field.isHtml);
const regularFields = batchedTranslations.filter(field => !field.isHtml);

// Process HTML fields with tag_handling=html
if (htmlFields.length > 0) {
  const htmlTexts = htmlFields.map(field => field.value);
  const htmlTranslations = await this.translateTexts(htmlTexts, {
    source_lang: sourceLanguage,
    target_lang: targetLanguage,
    tag_handling: 'html', // Enable HTML tag handling
  });
  
  // Map HTML translations back to fields
  htmlFields.forEach((field, index) => {
    translationMap.set(field.key, htmlTranslations[index]);
  });
}

// Process regular fields normally
if (regularFields.length > 0) {
  // Similar process without tag_handling=html
}
```

### 3. Translation Application Phase

When applying translations back to the document, the `applyBlockContentTranslations` function is called with the relevant parameters to handle both HTML and regular text translations:

```typescript
export const applyBlockContentTranslations = (
  params: ApplyBlockContentTranslationsParams,
): void => {
  const { value, key, currentArrayPath, translationMap } = params;

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
```

The translation application process handles two distinct cases:

1. **HTML Translations**: For blocks that were converted to HTML (complex blocks with marks/markDefs), the translated HTML is parsed back to block structure using `parseHtmlToBlockStructure`, preserving all formatting and marks.

2. **Simple Text Translations**: For blocks that were processed as simple text, the translations are applied directly to the corresponding spans in the block's children array.
## Edge Cases and Solutions


### 4. Optimization for Batch Processing

The TranslationService optimizes the translation process by batching fields and maintaining context:

```typescript
// Process translations in batches
const processBatch = async (batch: TranslationField[]) => {
  // Group by context for better translation quality
  const contextGroups = groupFieldsByContext(batch);
  
  for (const group of contextGroups) {
    // Process each context group
    await translateContextGroup(group, translationMap);
  }
};

// Process all batches
for (let i = 0; i < batches.length; i++) {
  await processBatch(batches[i]);
}
```

This batching approach ensures efficient API usage while maintaining translation quality through proper context handling.

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

### Duplicate Content

**Challenge**: Handling blocks with identical content at different locations  
**Solution**: Use unique keys based on array paths and block indices, not content

### Multiple Block Content Arrays

**Challenge**: Identifying and processing multiple block content arrays in the same document  
**Solution**: Process each array independently with its own path mapping

### Nested Block Content

**Challenge**: Handling block content arrays nested within objects  
**Solution**: Use recursive traversal with path building to maintain location context

### Key Preservation

**Challenge**: Sanity's `_key` values differ between language versions  
**Solution**: Use unique keys based on array paths and block indices, not Sanity's `_key` values which differ between language versions

### Header Context

**Challenge**: Providing appropriate context for headers  
**Solution**: Find the next normal block and use its text as context for header translation

### Mark Preservation

**Challenge**: Preserving formatting (bold, italic, etc.) through translation  
**Solution**: Convert complex blocks to HTML with appropriate tags before translation

### MarkDef References

**Challenge**: Maintaining links and references through translation  
**Solution**: Use data attributes in HTML to preserve markDef references

### Word Order Changes

**Challenge**: Translation can change word order, affecting mark application  
**Solution**: Use HTML tags to encapsulate marked text, letting DeepL preserve the structure

### Custom Marks

**Challenge**: Preserving custom marks not recognized as standard HTML  
**Solution**: Use data attributes (`data-mark="markName"`) to preserve custom marks

### HTML Parsing Errors

**Challenge**: Handling potential HTML parsing errors after translation  
**Solution**: Implement robust fallback mechanisms to ensure content is never lost

### HTML-based Translation Challenges

**Challenge**: Handling HTML-based translations, including parsing and applying translations  
**Solution**: Use a combination of HTML parsing and block structure parsing to ensure accurate translation application

## Performance Considerations

### HTML Conversion Overhead

The HTML-based translation approach introduces some performance overhead due to the conversion process:

1. **Selective Processing**: Only complex blocks (with marks, markDefs, or multiple children) use HTML conversion, minimizing overhead
2. **Caching**: The detection of complex blocks is performed once per block
3. **Lazy Parsing**: HTML parsing is only performed when needed

### htmlparser2 vs. Regex

The switch from regex-based parsing to htmlparser2 has performance implications:

1. **Pros**:
   - More robust handling of complex HTML
   - Better handling of nested structures
   - More maintainable code

2. **Cons**:
   - Slightly higher overhead for simple HTML
   - Additional dependency

### Batch Processing Optimization

The translation service optimizes API calls through batch processing:

1. **Field Grouping**: Fields are grouped by whether they need HTML processing
2. **Context Preservation**: Fields with the same context are processed together
3. **Batch Size**: Translations are processed in batches of 50 items

### Memory Usage

The block content processing system uses several data structures that impact memory usage:

1. **blockContentMap**: Stores mapping between keys and block locations
2. **translationMap**: Stores translations for each key
3. **HTML Representations**: Temporary HTML representations of blocks

These structures are cleared after each document translation to prevent memory leaks.

### Optimization Strategies

1. **Early Detection**: Quickly identify if an array is block content to avoid unnecessary processing
2. **Lazy HTML Conversion**: Only convert to HTML when necessary
3. **Reuse Original Structure**: Preserve as much of the original block structure as possible
4. **Efficient Parsing**: Use htmlparser2's streaming API for efficient HTML parsing
5. **Error Boundaries**: Implement fallbacks at each step to ensure robustness

## Conclusion

The block content processing system provides robust handling of Sanity's rich text format during translation. By separating this logic into dedicated utilities, the code is more maintainable and easier to understand. The system handles complex nested structures, preserves formatting, and enhances translation quality through contextual information.
