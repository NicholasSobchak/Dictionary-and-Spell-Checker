package com.quickquill.studio.repository;

import com.quickquill.studio.model.Session;
import com.quickquill.studio.model.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionRepository extends JpaRepository<Session, Long> {
  Optional<Session> findByToken(String token);

  void deleteByUser(User user);
}
