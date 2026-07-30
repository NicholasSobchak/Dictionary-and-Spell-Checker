package com.quickquill.studio.controller;

import com.quickquill.studio.engine.WordEngine;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class WordController {

  /**
   * Look up a word in the dictionary. Returns 200 with full word JSON on hit, or 404 with a
   * suggestion on miss.
   */
  @GetMapping("/word/{word}")
  public ResponseEntity<String> lookup(@PathVariable String word) {
    String json = WordEngine.lookup(word);
    int status = json.contains("\"found\" : false") ? 404 : 200;
    return ResponseEntity.status(status).contentType(MediaType.APPLICATION_JSON).body(json);
  }

  /** Spelling suggestions for a word. Returns JSON array. */
  @GetMapping("/suggest/{word}")
  public ResponseEntity<String> suggest(@PathVariable String word) {
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_JSON)
        .body(WordEngine.suggest(word));
  }

  /** Synonym suggestions for a word. Returns JSON array. */
  @GetMapping("/synonym/{word}")
  public ResponseEntity<String> synonym(@PathVariable String word) {
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_JSON)
        .body(WordEngine.synonym(word));
  }

  /**
   * Autocomplete for a prefix. Passes the user's history and suggested words as query params so the
   * engine can prioritize familiar completions.
   */
  @GetMapping("/autofill/{word}")
  public ResponseEntity<String> autofill(
      @PathVariable String word,
      @RequestParam(defaultValue = "") String history,
      @RequestParam(defaultValue = "") String suggested) {
    String historyJson = history.isEmpty() ? "[]" : history;
    String suggestedJson = suggested.isEmpty() ? "[]" : suggested;
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_JSON)
        .body(WordEngine.autofill(word, historyJson, suggestedJson));
  }
}
