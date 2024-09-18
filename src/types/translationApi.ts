import { SanityClient } from 'sanity';

export interface TranslationServiceOptions {
  client: SanityClient;
  deeplApiKey: string;
}
