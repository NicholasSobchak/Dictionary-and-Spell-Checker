package com.quickquill.studio.repository;

import com.quickquill.studio.model.Session;
import com.quickquill.studio.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SessionRepository extends JpaRepository<Session, Long> {
  Optional<Session> findByToken(String token);
  void deleteByUser(User user);
}
