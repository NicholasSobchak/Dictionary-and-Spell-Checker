package com.quickquill.studio.repository;

import com.quickquill.studio.model.Note;
import com.quickquill.studio.model.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteRepository extends JpaRepository<Note, Long> {
  Optional<Note> findByUser(User user);

  void deleteByUser(User user);
}
