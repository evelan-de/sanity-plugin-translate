# Sanity Plugin Translate

This Sanity plugin leverages the DeepL API to provide translation capabilities within Sanity Studio. It is designed to enhance content management systems by allowing automatic translation of text fields and document references based on specified languages.

## Features

- **Translation Integration**: Utilizes the `deepl-node` library to integrate with the DeepL API for robust translation capabilities.
- **Document Actions**: Includes actions for translating documents and fixing references within the Sanity Studio.
- **Configurable**: Supports configuration for different environments with customizable plugin options.
- **Customizable Field Keys**: Define which fields should be translated with support for custom field keys, type-specific fields, and exclusions via the TranslationService API.

## Installation

1. Install the plugin via npm or yarn:

   ```bash
   npm install sanity-plugin-translate
   # or
   yarn add sanity-plugin-translate
   ```

2. Include the plugin in your Sanity Studio's configuration.

## Configuration

To configure the plugin, you need to specify the DeepL API key and other optional settings in your Sanity Studio configuration file:

```javascript
import { TranslationPlugin } from 'sanity-plugin-translate';

export default createConfig({
   // Your existing Sanity configuration
   ...,
   plugins: [
      TranslationPlugin({
         BASE_URL: 'https://my-domain.com', // Or your API endpoint
         deeplApiKey: 'your-deepl-api-key',
         includeFixReferenceAction: true,
         includeTranslateAction: true,
         includeSyncDocumentsAction: true, // Optional
         includeSyncDocumentMediaAction: true, // Optional
      })
   ]
});
```

## Usage

After installation, you need to set up two components:

1. **Configure the plugin in your Sanity Studio** to add document actions
2. **Create API routes in your project** to handle the translation requests

### Setting Up API Routes

**Important**: This plugin requires you to create API routes in your project to handle translation requests. The document actions in Sanity Studio will send requests to these API endpoints.

You'll need to create the following API routes in your project:

- `/api/translate` - For document translation
- `/api/fix-references` - For fixing document references
- `/api/sync-documents` - For synchronizing documents (if enabled)
- `/api/sync-media-documents` - For synchronizing media objects (if enabled)

#### Next.js API Route Example

Here's an example of a Next.js App Router API route for translation (`app/api/translate/route.ts`):

```typescript
import { type NextRequest } from 'next/server';
import { TranslationService } from 'sanity-plugin-translate/service';
import { translationApiRequestBody } from 'sanity-plugin-translate/types';
import { createClient } from '@sanity/client';

export const maxDuration = 360;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Verify webhook secret for security
  const webhook_secret = req.headers.get('x-webhook-secret');
  if (
    !webhook_secret ||
    webhook_secret !== process.env.SANITY_TRANSLATE_WEBHOOK_SECRET
  ) {
    return new Response('Invalid webhook secret', { status: 401 });
  }

  // Parse and validate request body
  const body = await req.json();
  const parsedBody = translationApiRequestBody.safeParse(body);
  if (!parsedBody.success) {
    return new Response('Invalid body', { status: 400 });
  }

  const data = parsedBody.data;

  // Check for DeepL API key
  if (!process.env.DEEPL_API_KEY) {
    return new Response('Missing DEEPL_API_KEY', { status: 400 });
  }

  // Create Sanity client
  const client = createClient({
    projectId: process.env.SANITY_PROJECT_ID || '',
    dataset: process.env.SANITY_DATASET || '',
    token: process.env.SANITY_TOKEN,
    useCdn: false,
  });

  // Initialize TranslationService
  const translator = new TranslationService({
    client,
    deeplApiKey: process.env.DEEPL_API_KEY,
  });

  try {
    // Translate the document
    const { translatedJsonData, isTranslated } = await translator.translateDocument({
      data,
    });

    return new Response(
      JSON.stringify({
        isTranslated,
        translatedTexts: translatedJsonData,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error('Translation error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
```

You'll need to create similar routes for other actions (`fix-references`, `sync-documents`, `sync-media-documents`) using the appropriate TranslationService methods.

> **Note**: While this example uses Next.js, you can adapt it for other Node.js frameworks like Express, Fastify, or NestJS. The core logic remains the same - receive requests from Sanity Studio, process them with TranslationService, and return the results.

### Required Environment Variables

- `DEEPL_API_KEY`: Your DeepL API key
- `SANITY_TRANSLATE_WEBHOOK_SECRET`: A secret to secure your API endpoints
- `SANITY_PROJECT_ID`: Your Sanity project ID
- `SANITY_DATASET`: Your Sanity dataset name
- `SANITY_TOKEN`: A Sanity token with write permissions

### Translating a Document

Once your API routes are set up, you can translate documents by selecting the "Translate Document" action from the document action dropdown in Sanity Studio. This action will send a request to your API endpoint, which will use the DeepL API to translate the text fields of the document.

### Customizing Translatable Fields

The plugin allows you to customize which fields are considered translatable by configuring the `TranslationService` in your API route:

```typescript
// In your API route that handles translation requests (e.g., app/api/translate/route.ts)
import { TranslationService } from 'sanity-plugin-translate/service';
import { FieldKeyConfig } from 'sanity-plugin-translate/types';
import { createClient } from '@sanity/client';

// Define your custom field keys
const fieldKeyConfig: FieldKeyConfig = {
  // Add custom field keys to translate
  customTranslatableFieldKeys: [
    'summary',
    { type: ['product'], key: 'specifications' } // Type-specific field
  ],
  // Add custom array field keys to translate
  customTranslatableArrayFieldKeys: ['tags'],
  // Exclude specific default field keys
  excludeDefaultFieldKeys: ['placeholder'],
  excludeDefaultArrayFieldKeys: [],
};

// Create Sanity client
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

// Use the TranslationService with custom field keys
const translationService = new TranslationService({
  client,
  deeplApiKey: process.env.DEEPL_API_KEY,
  fieldKeyConfig, // Pass your custom field key configuration here
});
```

For detailed documentation on customizable field keys and integration, see:
- [Customizable Field Keys](./docs/CustomizableFieldKeys.md)
- [Integrating Custom Field Keys](./docs/IntegratingCustomFieldKeys.md)

### Fixing References

The "Fix Language References" action helps in adjusting document references to point to the translated versions of linked documents.

## Develop & Test

This plugin uses [@sanity/plugin-kit](https://github.com/sanity-io/plugin-kit) with default configuration for build & watch scripts.

See [Testing a plugin in Sanity Studio](https://github.com/sanity-io/plugin-kit#testing-a-plugin-in-sanity-studio) on how to run this plugin with hotreload in the studio.

## License

[MIT](LICENSE) © Evelan

## More Information

- **Repository**: [GitHub](https://github.com/evelan-de/sanity-plugin-translate)
- **Issues**: [GitHub Issues](https://github.com/evelan-de/sanity-plugin-translate/issues)
- **Author**: Evelan <kontakt@evelan.de>

For more details on configuration and advanced usage, refer to the [official documentation](https://github.com/evelan-de/sanity-plugin-translate#readme).
