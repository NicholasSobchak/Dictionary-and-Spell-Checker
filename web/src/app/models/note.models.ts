/** Note payload — GET/PUT /api/note?token= */ 
export interface NoteResponse {
  id: number;
  content: string;
  updatedAt: string;
}
