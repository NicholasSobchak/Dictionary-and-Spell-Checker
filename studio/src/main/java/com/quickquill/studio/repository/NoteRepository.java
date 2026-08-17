package com.quickquill.studio.repository;

import com.quickquill.studio.model.Note;
import com.quickquill.studio.model.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface NoteRepository extends JpaRepository<Note, Long> {
  Optional<Note> findByUser(User user);

  /** Derived delete removes rows entity-by-entity and must run in a transaction. */
  @Transactional
  void deleteByUser(User user);
}
