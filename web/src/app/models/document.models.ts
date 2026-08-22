/** Document list entry — GET /api/documents */
export interface DocumentSummary {
  id: number;
  title: string;
  updatedAt: string;
}

/** Full document — GET/POST /api/documents and PUT/POST/DELETE /api/documents/{id} */
export interface DocumentResponse extends DocumentSummary {
  content: string;
}
