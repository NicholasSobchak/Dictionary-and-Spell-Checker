// define predermined responses for testing purposes

import { AuthResponse, AuthUser } from '../models/auth.models';
import { DocumentResponse, DocumentSummary } from '../models/document.models';
import { AutofillResponse, WordError, WordNotFound, WordResponse } from '../models/word.models';

export const HELLO_WORD: WordResponse = {
  id: 1,
  lemma: 'hello',
  display_lemma: 'hello',
  forms: [{ form: 'hello', tag: 'interjection' }],
  senses: [
    {
      pos: 'interjection',
      definition: 'used as a greeting',
      examples: ['Hello, world!'],
      synonyms: ['hi'],
      antonyms: ['goodbye'],
    },
  ],
  etymology: ['from Old English hǣlþ'],
  alternative_searches: [],
};

export const WORD_NOT_FOUND: WordNotFound = { query: 'zzzz', found: false, suggestion: 'hello' };

export const WORD_ERROR: WordError = { error: 'Enter a valid word' };

export const AUTOFILL_RESPONSE: AutofillResponse = { completion: 'hello' };

export const TEST_USER: AuthUser = { id: 1, email: 'user@test.com', displayName: 'Test User' };

export const TEST_SESSION: AuthResponse = { token: 'test-token', user: TEST_USER };

export const TEST_DOCUMENT: DocumentResponse = {
  id: 1,
  title: 'Untitled',
  content: 'my note',
  updatedAt: '2026-08-18T00:00:00Z',
};

export const TEST_DOCUMENT_SUMMARY: DocumentSummary = {
  id: 1,
  title: 'Untitled',
  updatedAt: '2026-08-18T00:00:00Z',
};
