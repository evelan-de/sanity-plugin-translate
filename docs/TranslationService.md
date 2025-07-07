# TranslationService Documentation

## Overview

The `TranslationService` is a core component of the Sanity plugin for translation. It handles the automated translation of Sanity documents across different languages using the DeepL API. This service is designed to maintain document structure while translating content, handling complex nested fields, arrays, references, and Sanity's block content.

## Table of Contents

1. [Class Structure](#class-structure)
2. [Key Functionality](#key-functionality)
3. [Translation Process Flow](#translation-process-flow)
4. [Configuration](#configuration)
5. [Helper Functions](#helper-functions)
6. [Block Content Translation](#block-content-translation)
7. [Usage Examples](#usage-examples)

## Class Structure

### Private Properties

- `client`: A Sanity client for interacting with the CMS
- `previewClient`: An optional Sanity client for preview operations
- `deeplApiKey`: API key for the DeepL translation service

### Public Methods

1. `syncDocumentMedia`: Synchronizes media objects across document translations
2. `syncDocuments`: Synchronizes and translates content across document translations
3. `translateDocument`: Translates a single document
4. `fixReference`: Repairs reference links in translated documents

## Key Functionality

- **Field Identification**: Uses predefined lists (`translatableFieldKeys` and `translatableArrayFieldKeys`) to identify which fields should be translated
- **Reference Handling**: Processes document references to maintain proper linking across language versions
- **Translation**: Uses DeepL API to translate text content while preserving formatting
- **Document Updates**: Updates the translated documents in Sanity with the new translations
- **Media Synchronization**: Handles media synchronization across language versions
- **Block Content Processing**: Special handling for Sanity block content to preserve context during translation

## Translation Process Flow

1. **Document Identification**: The service first identifies the document to be translated using its ID.

2. **Reference Processing**: Any references within the document are processed to maintain proper linking across language versions.

3. **Field Mapping**: The service maps all translatable fields in the document, including nested objects and arrays. During this phase:
   - **Regular Fields**: Simple text fields are collected with their paths
   - **Block Content Detection**: Arrays containing Sanity block content are identified
   - **Complexity Analysis**: Block content is analyzed to determine if HTML-based translation is needed
   - **Context Enhancement**: Header blocks receive context from subsequent blocks for better translation quality

4. **Translation**: Content is sent to the DeepL API using different approaches based on content type:
   - **HTML-Based Translation**: Complex blocks with marks/markDefs are converted to HTML and translated with `tag_handling=html` to preserve formatting
   - **Context-Based Translation**: Header blocks are translated with context from subsequent blocks
   - **Batch Translation**: Regular fields are translated in batches (50 items per batch) for efficiency
   - **Array Field Translation**: Special array fields (e.g., keywords) are handled separately

5. **Translation Application**: Different strategies are used to apply translations:
   - **HTML Parsing**: Translated HTML is parsed back to block structure with preserved marks/markDefs
   - **Direct Text Replacement**: Simple text translations are applied directly to their fields
   - **Format Preservation**: Spaces, capitalization, and other formatting are preserved

6. **Document Update**: The translated document is updated in Sanity with the new translations.

### Detailed Flow Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Document       │────▶│  Reference     │────▶│  Field          │
│  Identification │     │  Processing     │     │  Mapping        │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                        ┌─────────────────────────────────────────────────┐
                        │                                                 │
                        │             Content Type Analysis               │
                        │                                                 │
                        └─────────────────────────────────────────────────┘
                                 │                 │                 │
                                 ▼                 ▼                 ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│                       │ │                       │ │                       │
│  Regular Field        │ │  Block Content        │ │  Array Field          │
│  Translation          │ │  Translation          │ │  Translation          │
│  (Batch Processing)   │ │  (HTML/Context)       │ │  (e.g., keywords)     │
│                       │ │                       │ │                       │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
          │                         │                         │
          └─────────────────────────┼─────────────────────────┘
                                    │
                                    ▼
                        ┌─────────────────────────┐
                        │                         │
                        │      DeepL API          │
                        │      Processing         │
                        │                         │
                        └─────────────────────────┘
                                    │
                                    ▼
                        ┌─────────────────────────┐
                        │                         │
                        │      Translation        │
                        │      Application        │
                        │                         │
                        └─────────────────────────┘
                                    │
                                    ▼
                        ┌─────────────────────────┐
                        │                         │
                        │      Document           │
                        │      Update             │
                        │                         │
                        └─────────────────────────┘
```

### Translation Approaches

The TranslationService employs multiple specialized approaches to handle different content types:

1. **Regular Fields**: Simple text fields are batched and translated directly.

2. **Block Content**: Rich text follows a specialized process:
   - **Simple Blocks**: Blocks without marks are translated as plain text
   - **Complex Blocks**: Blocks with marks/markDefs are converted to HTML, translated with tag preservation, and parsed back to block structure
   - **Header Blocks**: Receive context from subsequent blocks for improved translation quality
   
3. **Array Fields**: Special handling for array fields like keywords.

For detailed information on block content processing, see [BlockContentProcessing.md](./BlockContentProcessing.md).

## Configuration

The `TranslationService` is configured with the following options:

```typescript
interface TranslationServiceOptions {
  client: SanityClient;
  previewClient?: SanityClient;
  deeplApiKey: string;
}
```

## Helper Functions

### `mapFieldsToTranslate`

This function recursively traverses the document structure to identify fields that should be translated. It handles:

- Regular fields matching `translatableFieldKeys`
- Array fields matching `translatableArrayFieldKeys`
- Nested objects and arrays
- Special handling for block content

```typescript
const { fieldsToTranslate, arrayFieldsToTranslate } =
  mapFieldsToTranslate(jsonData);
```

### `replaceTranslations`

This function recursively applies translations back to the original document structure, preserving the document's structure while replacing text content.

```typescript
const translatedData = replaceTranslations(
  jsonData,
  uniqueFieldsToTranslate,
  batchedTranslations,
  uniqueSpecialArrayFieldsToTranslate,
  batchedArrayFieldTranslations,
);
```

### `findAllReferenceObjects`

Locates all reference objects within a document to handle them specially during translation.

### `processReferenceObjects`

Updates references to point to the correct language versions of referenced documents.

## Block Content Translation

> **Note:** For a comprehensive understanding of the block content processing system, please refer to the detailed documentation in [BlockContentProcessing.md](./BlockContentProcessing.md). This section provides a high-level overview of the functionality.

Sanity's block content (rich text) is handled specially to improve translation quality while maintaining document structure, formatting, and interactive elements.

### Sample Block Content Structure

Below is a simplified example of Sanity's block content structure. This shows how content is organized in blocks with nested spans, each potentially having different marks (styling) and markDefs (links, references):

```json
"body": [
  {
    "_key": "a1b2c3",
    "_type": "block",
    "style": "normal",
    "markDefs": [
      {
        "_key": "link123",
        "_type": "link",
        "href": "https://example.com"
      }
    ],
    "children": [
      {
        "_key": "d4e5f6",
        "_type": "span",
        "marks": ["strong", "link123"],
        "text": "This is bold linked text"
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

In this example:

- Each block represents a paragraph or heading
- Within each block, there are one or more spans containing the actual text
- Spans can have marks (like "strong" for bold text)
- markDefs define links and other references that can be referenced by marks
- When multiple spans exist in a block, they often represent different styling within the same paragraph

### Key Features

The block content translation system includes several advanced features:

1. **HTML-Based Translation**: Converts complex blocks to HTML before translation to preserve marks, markDefs, and structure.

2. **Header Context Enhancement**: Provides context for header blocks using the text from subsequent normal blocks, improving translation quality.

3. **Nested Block Content Detection**: Automatically identifies and processes block content arrays nested within objects at any depth.

4. **Path-Based Mapping**: Uses array paths and indices to create unique keys for each block, ensuring correct translation alignment across language versions.

5. **Modular Architecture**: All block content processing logic is organized in dedicated modules within the `blockContentUtils` folder.

6. **Robust HTML Parsing**: Uses htmlparser2 for reliable HTML parsing after translation.

### Modular Architecture

The block content processing system has been refactored into a modular architecture:

```
src/api/utils/blockContentUtils/
├── index.ts                   # Barrel file for re-exports
├── blockContentTypes.ts       # Type definitions and constants
├── blockContentDetection.ts   # Detection utilities
├── blockContentContext.ts     # Context handling utilities
├── blockContentHtml.ts        # HTML conversion and parsing utilities
└── blockContentProcessing.ts  # Main processing functions
```

This modular approach improves maintainability, readability, and separation of concerns.

### Integration

The TranslationService integrates with block content utilities at several key points:

1. **Field Mapping Phase**: Detects and processes block content arrays during `mapFieldsToTranslate`
2. **Translation Request Phase**: Sets `tag_handling=html` for HTML fields when sending to DeepL
3. **Translation Application Phase**: Parses HTML back to block structure for complex blocks
4. **Optimization**: Batches fields and maintains context for efficient API usage

> **For Developers:** The block content processing system has been fully refactored for better separation of concerns. See [BlockContentProcessing.md](./BlockContentProcessing.md) for detailed implementation information, process flow diagrams, and edge case handling.

### HTML-Based Translation Process

The system uses a smart detection approach to identify blocks that need HTML-based translation:

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

For complex blocks (with marks, markDefs, or multiple children), the process is:

1. Convert block to HTML using `@portabletext/to-html`
2. Flag the field with `isHtml: true`
3. Send to DeepL with `tag_handling=html`
4. Parse the translated HTML back to block structure using htmlparser2

For simple blocks, the traditional text-based approach is used for efficiency.

### Translation Application

When applying translations back to block content:

1. For HTML-based translations:
   - Parse the HTML back to block structure using htmlparser2
   - Preserve all marks, markDefs, and structure
   - Maintain original _key values where possible

2. For simple text translations:
   - Apply the translation directly to the span's text
   - Preserve original marks

This approach ensures comprehensive preservation of formatting and interactive elements while maintaining translation quality.

## Usage Examples

### Translating a Document

```typescript
const translationService = new TranslationService({
  client: sanityClient,
  deeplApiKey: 'your-deepl-api-key',
});

await translationService.translateDocument({
  data: {
    sourceDoc: { _id: 'source-doc-id', language: 'en' },
    targetDoc: { _id: 'target-doc-id', language: 'de' },
  },
});
```

### Synchronizing Media

```typescript
await translationService.syncDocumentMedia({
  data: {
    sourceDoc: { _id: 'source-doc-id', language: 'en' },
    targetDoc: { _id: 'target-doc-id', language: 'de' },
  },
});
```

### Fixing References

```typescript
await translationService.fixReference({
  data: {
    sourceDoc: { _id: 'source-doc-id', language: 'en' },
    targetDoc: { _id: 'target-doc-id', language: 'de' },
  },
});
```

## Implementation Details

### Constants

```typescript
// Translatable field keys
const translatableFieldKeys = [
  'altText',
  'label',
  'text', // Field name in block content children
  'title',
  'seoTitle',
  'description',
  // ... other fields
];

// Translatable array field keys
const translatableArrayFieldKeys = ['keywords'];

// Sanity block types
const BLOCK_CONTENT_TYPE = 'block';
const SPAN_TYPE = 'span';
```

### Block Content Mapping

The service uses a Map to track block content during translation:

```typescript
const blockContentMap: Map<string, { fieldName: string; blockIndex: number }> =
  new Map();
```

This map associates UUID keys with block locations, allowing the service to apply translations back to the correct blocks.

## Conclusion

The `TranslationService` provides a robust solution for translating Sanity documents while preserving their structure. Its special handling of block content ensures high-quality translations by maintaining context during the translation process.

For further information, refer to the source code at `src/api/service/TranslationService.ts`.
