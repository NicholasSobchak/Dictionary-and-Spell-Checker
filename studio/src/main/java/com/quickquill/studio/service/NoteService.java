package com.quickquill.studio.service;

import com.quickquill.studio.model.Note;
import com.quickquill.studio.model.User;
import com.quickquill.studio.repository.NoteRepository;
import org.springframework.stereotype.Service;

@Service
public class NoteService {

  private final AuthService authService;
  private final NoteRepository noteRepository;

  public NoteService(AuthService authService, NoteRepository noteRepository) {
    this.authService = authService;
    this.noteRepository = noteRepository;
  }

  /**
   * Returns the authenticated user's note, creating an empty one on first visit. The User always
   * comes from the validated token — there is no way to address another user's note.
   */
  public Note getNote(String token) {
    User user = authService.validateSession(token);
    return noteRepository.findByUser(user).orElseGet(() -> noteRepository.save(new Note(user)));
  }

  public Note saveNote(String token, String content) {
    User user = authService.validateSession(token);
    Note note = noteRepository.findByUser(user).orElseGet(() -> new Note(user));
    note.setContent(content);
    return noteRepository.save(note);
  }
}
