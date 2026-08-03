package com.quickquill.studio.service;

import com.quickquill.studio.model.Session;
import com.quickquill.studio.model.User;
import com.quickquill.studio.repository.NoteRepository;
import com.quickquill.studio.repository.SearchHistoryRepository;
import com.quickquill.studio.repository.SessionRepository;
import com.quickquill.studio.repository.SuggestedWordRepository;
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
  private final NoteRepository noteRepo;
  private final SearchHistoryRepository searchHistoryRepo;
  private final SuggestedWordRepository suggestedWordRepo;
  private final BCryptPasswordEncoder passwordEncoder;

  public AuthService(
      UserRepository userRepo,
      SessionRepository sessionRepo,
      NoteRepository noteRepo,
      SearchHistoryRepository searchHistoryRepo,
      SuggestedWordRepository suggestedWordRepo) {
    this.userRepo = userRepo;
    this.sessionRepo = sessionRepo;
    this.noteRepo = noteRepo;
    this.searchHistoryRepo = searchHistoryRepo;
    this.suggestedWordRepo = suggestedWordRepo;
    this.passwordEncoder = new BCryptPasswordEncoder();
  }

  /** Registers a user and immediately opens a session so signup needs no second login call. */
  public Session signup(String email, String password, String displayName) {
    if (userRepo.findByEmail(email).isPresent()) {
      throw new IllegalArgumentException("Email already registered.");
    }
    User user = new User(email, passwordEncoder.encode(password), displayName);
    try {
      user = userRepo.save(user);
    } catch (DataIntegrityViolationException e) {
      throw new IllegalArgumentException("Email already registered.");
    }
    return sessionRepo.save(new Session(user));
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

  /** Resolves the user from the session token — never trusts a client-supplied user id. */
  public void changePassword(String token, String oldPassword, String newPassword) {
    User user = validateSession(token);

    if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
      throw new IllegalArgumentException("Wrong password.");
    }

    user.setPasswordHash(passwordEncoder.encode(newPassword));
    userRepo.save(user);
  }

  /** Resolves the user from the session token and deletes the account and all dependent rows. */
  public void deleteAccount(String token) {
    User user = validateSession(token);
    // Child rows reference the user with non-null FKs — delete them before the user.
    noteRepo.deleteByUser(user);
    searchHistoryRepo.deleteByUser(user);
    suggestedWordRepo.deleteByUser(user);
    sessionRepo.deleteByUser(user);
    userRepo.deleteById(user.getId());
  }
}
