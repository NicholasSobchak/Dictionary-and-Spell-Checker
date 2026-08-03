package com.quickquill.studio.service;

import com.quickquill.studio.model.SearchHistory;
import com.quickquill.studio.model.User;
import com.quickquill.studio.repository.SearchHistoryRepository;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
public class SearchHistoryService {

  private static final int MAX_HISTORY = 500;

  private final AuthService authService;
  private final SearchHistoryRepository repository;

  public SearchHistoryService(AuthService authService, SearchHistoryRepository repository) {
    this.authService = authService;
    this.repository = repository;
  }

  /** Returns the authenticated user's search words, most recent first. */
  public List<String> getHistory(String token) {
    User user = authService.validateSession(token);
    return repository.findByUserOrderByCreatedAtDesc(user).stream()
        .map(SearchHistory::getWord)
        .toList();
  }

  public void record(String token, String word) {
    User user = authService.validateSession(token);
    save(user, word);
    trim(user);
  }

  /** Records many words in the given order (used to backfill local history on login). */
  public void recordAll(String token, List<String> words) {
    User user = authService.validateSession(token);
    for (String word : words) {
      save(user, word);
    }
    trim(user);
  }

  public void clear(String token) {
    User user = authService.validateSession(token);
    repository.deleteByUser(user);
  }

  /** Inserts a word, moving it to the front by deleting any previous entry. */
  private void save(User user, String word) {
    if (word == null || word.isBlank()) {
      return;
    }
    String clean = word.trim();
    repository.findByUserAndWord(user, clean).ifPresent(repository::delete);
    try {
      repository.save(new SearchHistory(user, clean));
    } catch (DataIntegrityViolationException e) {
      // A concurrent request may have inserted the same word between our delete and
      // save — treat that as success (the word is already recorded).
    }
  }

  private void trim(User user) {
    List<SearchHistory> all = repository.findByUserOrderByCreatedAtDesc(user);
    if (all.size() > MAX_HISTORY) {
      repository.deleteAll(all.subList(MAX_HISTORY, all.size()));
    }
  }
}
