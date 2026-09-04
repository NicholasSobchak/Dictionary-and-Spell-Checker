package com.quickquill.studio.controller;

import com.quickquill.studio.config.AuthToken;
import com.quickquill.studio.service.SearchHistoryService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/search-history")
public class SearchHistoryController {

  private final SearchHistoryService searchHistoryService;

  public SearchHistoryController(SearchHistoryService searchHistoryService) {
    this.searchHistoryService = searchHistoryService;
  }

  /** Returns the authenticated user's search words, most recent first. */
  @GetMapping
  public ResponseEntity<?> getHistory(@RequestHeader("Authorization") String authorization) {
    return ResponseEntity.ok(searchHistoryService.getHistory(AuthToken.fromHeader(authorization)));
  }

  /** Records a single search. */
  @PostMapping
  public ResponseEntity<?> record(
      @RequestHeader("Authorization") String authorization, @RequestParam String word) {
    searchHistoryService.record(AuthToken.fromHeader(authorization), word);
    return ResponseEntity.ok(Map.of("message", "Search recorded."));
  }

  /** Clears the authenticated user's search history. */
  @DeleteMapping
  public ResponseEntity<?> clear(@RequestHeader("Authorization") String authorization) {
    searchHistoryService.clear(AuthToken.fromHeader(authorization));
    return ResponseEntity.ok(Map.of("message", "Search history cleared."));
  }
}
