import { removeUndefinedLocaleResources } from 'sanity';

export const DEFAULT_DE_SCHEMA_TRANSLATIONS = removeUndefinedLocaleResources({
  // Translate Action translations
  'translateAction.toast.success.title': 'Übersetzung abgeschlossen',
  'translateAction.toast.success.description':
    'Das Dokument wurde erfolgreich übersetzt.',
  'translateAction.toast.error.title': 'Übersetzung fehlgeschlagen',
  'translateAction.toast.error.description':
    'Bei der Übersetzung ist ein Fehler aufgetreten.',
  'translateAction.label': 'Dokument übersetzen',
  'translateAction.label.loading': 'Dokument übersetzen...',

  // Fix References Action translations
  'fixReferenceAction.toast.success.title': 'Prozess abgeschlossen',
  'fixReferenceAction.toast.success.description':
    'Die Dokumentverweise wurden erfolgreich korrigiert.',
  'fixReferenceAction.toast.error.title': 'Prozess fehlgeschlagen',
  'fixReferenceAction.toast.error.description':
    'Beim Versuch, Referenzen zu reparieren, ist ein Fehler aufgetreten.',
  'fixReferenceAction.label': 'Sprachreferenzen korrigieren',
  'fixReferenceAction.label.loading': 'Sprachreferenzen korrigieren...',
});
