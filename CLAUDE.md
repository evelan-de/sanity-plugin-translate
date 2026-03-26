# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # Build the plugin (verify + pkg-utils build)
npm run watch          # Watch mode during development
npm test               # Run all tests (vitest run)
npm run lint           # Lint with ESLint
npm run lint-fix       # Auto-fix lint issues
npm run format         # Format with Prettier
npm run link-watch     # Test plugin in Sanity Studio with hot reload
```

Run a single test file:
```bash
npx vitest run src/api/service/__tests__/TranslationService.test.ts
```

Run tests matching a pattern:
```bash
npx vitest run --grep "mapFieldsToTranslate"
```

## Architecture

This is a Sanity Studio plugin that integrates the DeepL API for automatic document translation. The plugin is consumed by a Sanity Studio and communicates with a separate backend (Next.js or Express) that hosts the DeepL API credentials.

### Plugin entry point

`src/index.ts` exports `TranslationPlugin`, which is configured in the consumer's Sanity Studio `sanity.config.ts`:

```typescript
TranslationPlugin({
  BASE_URL: string,                       // Backend API endpoint URL
  includeTranslateAction: boolean,        // Default true
  includeFixReferenceAction: boolean,     // Default true
  includeSyncDocumentsAction: boolean,    // Default true
  includeSyncDocumentMediaAction: boolean // Default true
})
```

`src/plugin/plugin.ts` registers 4 document actions with Sanity Studio.

### Translation flow

1. User triggers a document action in Sanity Studio UI (`src/components/documentActions/`)
2. Action calls the consumer's `BASE_URL` API endpoint
3. The API endpoint is expected to use `TranslationService` (`src/api/service/TranslationService.ts`), which:
   - `mapFieldsToTranslate()` — walks the document, extracts fields matching configured translatable keys
   - Sends extracted text to DeepL API
   - `replaceTranslations()` — writes translations back into the document structure

`TranslationService` is exported from the package so consumers can use it in their own API routes.

### Field key system

Controls which fields get translated. Configured via `FieldKeyConfig`:

- Simple string: `['title', 'description']` — applies to all document types
- Type-scoped: `{ type: ['product'], key: 'specifications' }` — applies only to specific document types

Default keys are defined in `src/api/utils/fieldKeyManager.ts`. Custom keys are merged on top. See `docs/CustomizableFieldKeys.md` for the full config reference.

### Block content (Portable Text)

Block content arrays require special handling — they are converted to/from HTML before being sent to DeepL. The conversion logic is in `src/api/utils/blockContentUtils/`. A `blockContentMap` stores mappings between the HTML and the original block structure; call `clearBlockContentMap()` in tests that modify it.

### i18n

Plugin UI strings are in `src/utils/i18n/` (en-US and de-DE). The Sanity i18n system is used via `useTranslation` with the `translate` namespace.
