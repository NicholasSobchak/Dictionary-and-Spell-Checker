package com.quickquill.studio.service;

import com.quickquill.studio.model.Session;
import com.quickquill.studio.model.User;
import com.quickquill.studio.repository.SessionRepository;
import com.quickquill.studio.repository.UserRepository;
import java.time.Duration;
import java.time.Instant;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

  private final UserRepository userRepo;
  private final SessionRepository sessionRepo;
  private final BCryptPasswordEncoder passwordEncoder;

  public AuthService(UserRepository userRepo, SessionRepository sessionRepo) {
    this.userRepo = userRepo;
    this.sessionRepo = sessionRepo;
    this.passwordEncoder = new BCryptPasswordEncoder();
  }

  public User signup(String email, String password, String displayName) {
    if (userRepo.findByEmail(email).isPresent()) {
      throw new IllegalArgumentException("Email already registered.");
    }
    User user = new User(email, passwordEncoder.encode(password), displayName);
    try {
      return userRepo.save(user);
    } catch (DataIntegrityViolationException e) {
      throw new IllegalArgumentException("Email already registered.");
    }
  }

  public Session login(String email, String password) {
    User user =
        userRepo
            .findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Invalid email or password."));

    if (!passwordEncoder.matches(password, user.getPassword())) {
      throw new IllegalArgumentException("Invalid email or password.");
    }

    return sessionRepo.save(new Session(user));
  }

  public void logout(String token) {
    sessionRepo.findByToken(token).ifPresent(sessionRepo::delete);
  }

  public User validateSession(String token) {
    Session session =
        sessionRepo
            .findByToken(token)
            .orElseThrow(() -> new IllegalArgumentException("Invalid session."));

    if (session.isExpired()) {
      sessionRepo.delete(session);
      throw new IllegalArgumentException("Session expired.");
    }

    return session.getUser();
  }

  public Session refreshSession(String token) {
    Session session =
        sessionRepo
            .findByToken(token)
            .orElseThrow(() -> new IllegalArgumentException("Invalid session."));

    if (session.isExpired()) {
      sessionRepo.delete(session);
      throw new IllegalArgumentException("Session expired.");
    }

    session.setExpiresAt(Instant.now().plus(Duration.ofDays(7)));
    return sessionRepo.save(session);
  }

  public User updateProfile(String token, String displayName, String email) {
    User user = validateSession(token);

    userRepo
        .findByEmail(email)
        .filter(existing -> !existing.getId().equals(user.getId()))
        .ifPresent(
            existing -> {
              throw new IllegalArgumentException("Email already registered.");
            });

    user.setDisplayName(displayName);
    user.setEmail(email);
    try {
      return userRepo.save(user);
    } catch (DataIntegrityViolationException e) {
      throw new IllegalArgumentException("Email already registered.");
    }
  }

  public void changePassword(Long userId, String oldPassword, String newPassword) {
    User user =
        userRepo
            .findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found."));

    if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
      throw new IllegalArgumentException("Wrong password.");
    }

    user.setPasswordHash(passwordEncoder.encode(newPassword));
    userRepo.save(user);
  }

  public void deleteAccount(Long userId) {
    sessionRepo.deleteByUser(userRepo.getReferenceById(userId));
    userRepo.deleteById(userId);
  }
}
