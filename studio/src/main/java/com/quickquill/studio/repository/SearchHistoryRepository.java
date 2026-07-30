package com.quickquill.studio.repository;

import com.quickquill.studio.model.SearchHistory;
import com.quickquill.studio.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SearchHistoryRepository extends JpaRepository<SearchHistory, Long> {
  List<SearchHistory> findByUserOrderByCreatedAtDesc(User user);
  Optional<SearchHistory> findByUserAndWord(User user, String word);
}
