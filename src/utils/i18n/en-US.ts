import { removeUndefinedLocaleResources } from 'sanity';

export const DEFAULT_EN_SCHEMA_TRANSLATIONS = removeUndefinedLocaleResources({
  // Translate Action translations
  'translateAction.toast.success.title': 'Translation Complete',
  'translateAction.toast.success.description':
    'The document has been successfully translated.',
  'translateAction.toast.error.title': 'Translation Failed',
  'translateAction.toast.error.description':
    'An error occurred during the translation process.',
  'translateAction.label': 'Translate Document',
  'translateAction.label.loading': 'Translating Document...',

  // Fix References Action translations
  'fixReferenceAction.toast.success.title': 'Process Complete',
  'fixReferenceAction.toast.success.description':
    'The document references were successfully fixed.',
  'fixReferenceAction.toast.error.title': 'Process Failed',
  'fixReferenceAction.toast.error.description':
    'An error occurred while attempting to fix references.',
  'fixReferenceAction.label': 'Fix Language References',
  'fixReferenceAction.label.loading': 'Fixing Language References...',

  // Sync Documents Action translations
  'syncDocumentsAction.toast.success.title': 'Synchronization Complete',
  'syncDocumentsAction.toast.success.description':
    'The translated documents have been successfully synchronized.',
  'syncDocumentsAction.toast.error.title': 'Synchronization Failed',
  'syncDocumentsAction.toast.error.description':
    'An error occurred during the synchronization process.',
  'syncDocumentsAction.label': 'Synchronize Translated Documents',
  'syncDocumentsAction.label.loading': 'Synchronizing Translated Documents...',

  // Sync Documents Media Action translations
  'syncDocumentsMediaAction.toast.success.title': 'Synchronization Complete',
  'syncDocumentsMediaAction.toast.success.description':
    'The translated documents media have been successfully synchronized.',
  'syncDocumentsMediaAction.toast.error.title': 'Synchronization Failed',
  'syncDocumentsMediaAction.toast.error.description':
    'An error occurred during the synchronization process.',
  'syncDocumentsMediaAction.label': 'Synchronize Translated Documents Media',
  'syncDocumentsMediaAction.label.loading':
    'Synchronizing Translated Documents Media...',
});
