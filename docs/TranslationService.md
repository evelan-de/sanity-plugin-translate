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

1. **Document Identification**: Locates the document using its ID
2. **Reference Processing**: Identifies and processes references
3. **Field Mapping**: Maps fields for translation using `mapFieldsToTranslate`
4. **Translation**: Translates content via DeepL API in batches (50 items per batch)
5. **Format Preservation**: Preserves spaces, capitalization, and other formatting
6. **Document Update**: Updates the document in Sanity with translated content

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
const { fieldsToTranslate, arrayFieldsToTranslate } = mapFieldsToTranslate(jsonData);
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

Sanity's block content (rich text) is handled specially to improve translation quality while maintaining document structure.

### Sample Block Content Structure

Below is a simplified example of Sanity's block content structure. This shows how content is organized in blocks with nested spans, each potentially having different marks (styling):

```json
"body": [
  {
    "_key": "a1b2c3",
    "_type": "block",
    "children": [
      {
        "_key": "d4e5f6",
        "_type": "span",
        "marks": [],
        "text": "This is a heading"
      }
    ],
    "markDefs": [],
    "style": "h2"
  },
  {
    "_key": "g7h8i9",
    "_type": "block",
    "children": [
      {
        "_key": "j1k2l3",
        "_type": "span",
        "marks": [],
        "text": "This is a paragraph with "
      },
      {
        "_key": "m4n5o6",
        "_type": "span",
        "marks": [
          "strong"
        ],
        "text": "bold text"
      },
      {
        "_key": "p7q8r9",
        "_type": "span",
        "marks": [],
        "text": " and normal text again."
      }
    ],
    "markDefs": [],
    "style": "normal"
  }
]
```

In this example:
- Each block represents a paragraph or heading
- Within each block, there are one or more spans containing the actual text
- Spans can have marks (like "strong" for bold text)
- When multiple spans exist in a block, they often represent different styling within the same paragraph

### Detection

Block content arrays are detected using the `isBlockContent` helper function, which identifies arrays containing objects with:
- `_type` property equal to 'block'
- `children` array containing spans with text

```typescript
const isBlockContent = (array: any[]): boolean => {
  return (
    Array.isArray(array) &&
    array.some(
      (item) =>
        item._type === BLOCK_CONTENT_TYPE &&
        Array.isArray(item.children) &&
        item.children.some(
          (child: any) =>
            child._type === SPAN_TYPE && typeof child.text === 'string',
        ),
    )
  );
};
```

### Text Joining

When block content is detected, the service:

1. Joins all text from spans within each block into a single string
2. Generates a unique key using Sanity's UUID
3. Stores a mapping between this key and the block's location
4. Adds the joined text to the translation list with the unique key

This approach preserves the context of the text during translation, resulting in better quality translations.

### Translation Application

When applying translations back to block content:

1. For single-span blocks:
   - The translation is applied directly
   - Original marks (styling) are preserved

2. For multi-span blocks:
   - All translated text is placed in the first span
   - All marks are removed to prevent inconsistent styling
   - Other spans are emptied

This approach balances translation quality with document structure preservation.

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
const blockContentMap: Map<string, { fieldName: string; blockIndex: number }> = new Map();
```

This map associates UUID keys with block locations, allowing the service to apply translations back to the correct blocks.

## Conclusion

The `TranslationService` provides a robust solution for translating Sanity documents while preserving their structure. Its special handling of block content ensures high-quality translations by maintaining context during the translation process.

For further information, refer to the source code at `src/api/service/TranslationService.ts`.
