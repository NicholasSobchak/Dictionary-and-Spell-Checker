package com.quickquill.studio.controller;

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
  public ResponseEntity<?> getHistory(@RequestParam String token) {
    return ResponseEntity.ok(searchHistoryService.getHistory(token));
  }

  /** Records a single search. */
  @PostMapping
  public ResponseEntity<?> record(@RequestParam String token, @RequestParam String word) {
    searchHistoryService.record(token, word);
    return ResponseEntity.ok(Map.of("message", "Search recorded."));
  }

  /** Clears the authenticated user's search history. */
  @DeleteMapping
  public ResponseEntity<?> clear(@RequestParam String token) {
    searchHistoryService.clear(token);
    return ResponseEntity.ok(Map.of("message", "Search history cleared."));
  }
}
