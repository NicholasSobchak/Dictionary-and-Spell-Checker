export interface WordSense {
  pos: string;
  definition: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
}

export interface WordForm {
  form: string;
  tag: string;
}

/** Successful lookup — GET /api/word/{word} → 200 */
export interface WordResponse {
  id: number;
  lemma: string;
  display_lemma?: string;
  query?: string;
  forms: WordForm[];
  senses: WordSense[];
  etymology: string[];
  alternative_searches: string[];
}

/** Not found — GET /api/word/{word} → 404 */
export interface WordNotFound {
  query: string;
  found: false;
  suggestion?: string;
}

/** Error — GET /api/word/{word} → 400 */
export interface WordError {
  error: string;
}

/** Autofill completion — GET /api/autofill/{word} → 200 */
export interface AutofillResponse {
  completion: string;
}

/** All possible responses from GET /api/word/{word} */
export type WordResult = WordResponse | WordNotFound | WordError;
