package com.quickquill.studio.repository;

import com.quickquill.studio.model.SuggestedWord;
import com.quickquill.studio.model.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SuggestedWordRepository extends JpaRepository<SuggestedWord, Long> {
  List<SuggestedWord> findByUserOrderByCreatedAtDesc(User user);

  Optional<SuggestedWord> findByUserAndWord(User user, String word);

  void deleteByUser(User user);
}
