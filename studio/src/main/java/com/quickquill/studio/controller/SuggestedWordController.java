package com.quickquill.studio.controller;

import com.quickquill.studio.config.AuthToken;
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
  public ResponseEntity<?> getWords(@RequestHeader("Authorization") String authorization) {
    return ResponseEntity.ok(suggestedWordService.getWords(AuthToken.fromHeader(authorization)));
  }

  /** Records many words at once (used to store synonyms and backfill after login). */
  @PostMapping("/sync")
  public ResponseEntity<?> sync(
      @RequestHeader("Authorization") String authorization,
      @RequestParam(required = false) List<String> word) {
    suggestedWordService.recordAll(
        AuthToken.fromHeader(authorization), word == null ? List.of() : word);
    return ResponseEntity.ok(Map.of("message", "Suggested words synced."));
  }

  /** Clears the authenticated user's suggested words. */
  @DeleteMapping
  public ResponseEntity<?> clear(@RequestHeader("Authorization") String authorization) {
    suggestedWordService.clear(AuthToken.fromHeader(authorization));
    return ResponseEntity.ok(Map.of("message", "Suggested words cleared."));
  }
}
