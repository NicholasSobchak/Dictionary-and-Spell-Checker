package com.quickquill.studio.controller;

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

  @PostMapping("/signup")
  // IllegalArgumentException (duplicate email) → GlobalExceptionHandler → 409
  public ResponseEntity<?> signup(
      @RequestParam String email, @RequestParam String password, @RequestParam String displayName) {
    User user = authService.signup(email, password, displayName);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(
            Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "displayName", user.getDisplayName(),
                "message", "User registered successfully."));
  }

  @PostMapping("/login")
  // IllegalArgumentException (bad credentials) → GlobalExceptionHandler → 401
  public ResponseEntity<?> login(@RequestParam String email, @RequestParam String password) {
    Session session = authService.login(email, password);
    return ResponseEntity.ok(
        Map.of(
            "token", session.getToken(),
            "user",
                Map.of(
                    "id", session.getUser().getId(),
                    "email", session.getUser().getEmail(),
                    "displayName", session.getUser().getDisplayName()),
            "message", "User logged in successfully."));
  }

  @PostMapping("/logout")
  public ResponseEntity<?> logout(@RequestParam String token) {
    authService.logout(token);
    return ResponseEntity.ok(Map.of("message", "User logged out successfully."));
  }

  @PostMapping("/update")
  // IllegalArgumentException (email taken) → GlobalExceptionHandler → 409
  public ResponseEntity<?> update(
      @RequestParam String token, @RequestParam String displayName, @RequestParam String email) {
    User user = authService.updateProfile(token, displayName, email);
    return ResponseEntity.ok(
        Map.of(
            "id", user.getId(),
            "email", user.getEmail(),
            "displayName", user.getDisplayName()));
  }

  @GetMapping("/me")
  // IllegalArgumentException (invalid/expired token) → GlobalExceptionHandler → 401
  public ResponseEntity<?> me(@RequestParam String token) {
    User user = authService.validateSession(token);
    return ResponseEntity.ok(
        Map.of(
            "id", user.getId(),
            "email", user.getEmail(),
            "displayName", user.getDisplayName()));
  }
}
