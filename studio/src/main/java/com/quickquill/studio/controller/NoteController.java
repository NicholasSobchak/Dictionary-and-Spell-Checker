package com.quickquill.studio.controller;

import com.quickquill.studio.model.Note;
import com.quickquill.studio.service.NoteService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/note")
public class NoteController {

  private final NoteService noteService;

  public NoteController(NoteService noteService) {
    this.noteService = noteService;
  }

  /** Returns the authenticated user's note. 401 on invalid/expired token. */
  @GetMapping
  public ResponseEntity<?> getNote(@RequestParam String token) {
    Note note = noteService.getNote(token);
    return ResponseEntity.ok(noteJson(note));
  }

  /** Saves the authenticated user's note. Content travels form-encoded in the body. */
  @PutMapping
  public ResponseEntity<?> saveNote(@RequestParam String token, @RequestParam String content) {
    Note note = noteService.saveNote(token, content);
    return ResponseEntity.ok(noteJson(note));
  }

  private static Map<String, Object> noteJson(Note note) {
    return Map.of(
        "id", note.getId(),
        "content", note.getContent(),
        "updatedAt", note.getUpdatedAt().toString());
  }
}
