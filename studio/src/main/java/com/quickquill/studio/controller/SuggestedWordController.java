package com.quickquill.studio.controller;

import com.quickquill.studio.service.SuggestedWordService;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/suggested-words")
public class SuggestedWordController {

  private final SuggestedWordService suggestedWordService;

  public SuggestedWordController(SuggestedWordService suggestedWordService) {
    this.suggestedWordService = suggestedWordService;
  }

  /** Returns the authenticated user's suggested words, most recent first. */
  @GetMapping
  public ResponseEntity<?> getWords(@RequestParam String token) {
    return ResponseEntity.ok(suggestedWordService.getWords(token));
  }

  /** Records many words at once (used to store synonyms and backfill after login). */
  @PostMapping("/sync")
  public ResponseEntity<?> sync(
      @RequestParam String token, @RequestParam(required = false) List<String> word) {
    suggestedWordService.recordAll(token, word == null ? List.of() : word);
    return ResponseEntity.ok(Map.of("message", "Suggested words synced."));
  }

  /** Clears the authenticated user's suggested words. */
  @DeleteMapping
  public ResponseEntity<?> clear(@RequestParam String token) {
    suggestedWordService.clear(token);
    return ResponseEntity.ok(Map.of("message", "Suggested words cleared."));
  }
}
