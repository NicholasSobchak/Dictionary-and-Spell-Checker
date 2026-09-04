package com.quickquill.studio.controller;

import com.quickquill.studio.config.AuthToken;
import com.quickquill.studio.model.Session;
import com.quickquill.studio.model.User;
import com.quickquill.studio.service.AuthService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  /** Registers a user and returns a session token so the client can skip a second login call. */
  @PostMapping("/signup")
  // IllegalArgumentException (duplicate email) → GlobalExceptionHandler → 409
  public ResponseEntity<?> signup(
      @RequestParam String email, @RequestParam String password, @RequestParam String displayName) {
    Session session = authService.signup(email, password, displayName);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(sessionResponse(session, "User registered successfully."));
  }

  @PostMapping("/login")
  // IllegalArgumentException (bad credentials) → GlobalExceptionHandler → 401
  public ResponseEntity<?> login(@RequestParam String email, @RequestParam String password) {
    Session session = authService.login(email, password);
    return ResponseEntity.ok(sessionResponse(session, "User logged in successfully."));
  }

  @PostMapping("/logout")
  public ResponseEntity<?> logout(@RequestHeader("Authorization") String authorization) {
    authService.logout(AuthToken.fromHeader(authorization));
    return ResponseEntity.ok(Map.of("message", "User logged out successfully."));
  }

  /** Extends the session's expiry. Called by the client on app start to keep sessions alive. */
  @PostMapping("/refresh")
  // IllegalArgumentException (invalid/expired token) → GlobalExceptionHandler → 401
  public ResponseEntity<?> refresh(@RequestHeader("Authorization") String authorization) {
    Session session = authService.refreshSession(AuthToken.fromHeader(authorization));
    return ResponseEntity.ok(sessionResponse(session, "Session refreshed."));
  }

  @PostMapping("/change-password")
  // IllegalArgumentException (wrong password / invalid token) → GlobalExceptionHandler → 401
  public ResponseEntity<?> changePassword(
      @RequestHeader("Authorization") String authorization,
      @RequestParam String oldPassword,
      @RequestParam String newPassword) {
    authService.changePassword(AuthToken.fromHeader(authorization), oldPassword, newPassword);
    return ResponseEntity.ok(Map.of("message", "Password changed successfully."));
  }

  @PostMapping("/delete-account")
  // IllegalArgumentException (invalid token) → GlobalExceptionHandler → 401
  public ResponseEntity<?> deleteAccount(@RequestHeader("Authorization") String authorization) {
    authService.deleteAccount(AuthToken.fromHeader(authorization));
    return ResponseEntity.ok(Map.of("message", "Account deleted successfully."));
  }

  @PostMapping("/update")
  // IllegalArgumentException (email taken) → GlobalExceptionHandler → 409
  public ResponseEntity<?> update(
      @RequestHeader("Authorization") String authorization,
      @RequestParam String displayName,
      @RequestParam String email) {
    User user = authService.updateProfile(AuthToken.fromHeader(authorization), displayName, email);
    return ResponseEntity.ok(userJson(user));
  }

  @GetMapping("/me")
  // IllegalArgumentException (invalid/expired token) → GlobalExceptionHandler → 401
  public ResponseEntity<?> me(@RequestHeader("Authorization") String authorization) {
    User user = authService.validateSession(AuthToken.fromHeader(authorization));
    return ResponseEntity.ok(userJson(user));
  }

  private static Map<String, Object> userJson(User user) {
    return Map.of(
        "id", user.getId(),
        "email", user.getEmail(),
        "displayName", user.getDisplayName());
  }

  private static Map<String, Object> sessionResponse(Session session, String message) {
    return Map.of(
        "token", session.getToken(),
        "user", userJson(session.getUser()),
        "message", message);
  }
}
