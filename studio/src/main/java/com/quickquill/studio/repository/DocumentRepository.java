package com.quickquill.studio.repository;

import com.quickquill.studio.model.Document;
import com.quickquill.studio.model.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface DocumentRepository extends JpaRepository<Document, Long> {
  List<Document> findByUserOrderByUpdatedAtDesc(User user);

  Optional<Document> findByIdAndUser(Long id, User user);

  /** Derived delete removes rows entity-by-entity and must run in a transaction. */
  @Transactional
  void deleteByUser(User user);
}
