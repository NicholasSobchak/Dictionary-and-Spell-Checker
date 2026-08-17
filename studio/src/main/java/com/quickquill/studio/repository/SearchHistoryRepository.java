package com.quickquill.studio.repository;

import com.quickquill.studio.model.SearchHistory;
import com.quickquill.studio.model.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface SearchHistoryRepository extends JpaRepository<SearchHistory, Long> {
  List<SearchHistory> findByUserOrderByCreatedAtDesc(User user);

  Optional<SearchHistory> findByUserAndWord(User user, String word);

  /** Derived delete removes rows entity-by-entity and must run in a transaction. */
  @Transactional
  void deleteByUser(User user);
}
