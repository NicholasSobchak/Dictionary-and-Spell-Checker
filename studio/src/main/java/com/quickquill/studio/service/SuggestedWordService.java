package com.quickquill.studio.service;

import com.quickquill.studio.model.SuggestedWord;
import com.quickquill.studio.model.User;
import com.quickquill.studio.repository.SuggestedWordRepository;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
public class SuggestedWordService {

  private static final int MAX_WORDS = 1000;

  private final AuthService authService;
  private final SuggestedWordRepository repository;

  public SuggestedWordService(AuthService authService, SuggestedWordRepository repository) {
    this.authService = authService;
    this.repository = repository;
  }

  /** Returns the authenticated user's suggested words, most recent first. */
  public List<String> getWords(String token) {
    User user = authService.validateSession(token);
    return repository.findByUserOrderByCreatedAtDesc(user).stream()
        .map(SuggestedWord::getWord)
        .toList();
  }

  /** Records many words in the given order (used to store synonyms and backfill on login). */
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
      repository.save(new SuggestedWord(user, clean));
    } catch (DataIntegrityViolationException e) {
      // A concurrent request may have inserted the same word between our delete and
      // save — treat that as success (the word is already recorded).
    }
  }

  private void trim(User user) {
    List<SuggestedWord> all = repository.findByUserOrderByCreatedAtDesc(user);
    if (all.size() > MAX_WORDS) {
      repository.deleteAll(all.subList(MAX_WORDS, all.size()));
    }
  }
}
