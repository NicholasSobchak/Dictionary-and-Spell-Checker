package com.quickquill.studio.config;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException e) {
    String msg = e.getMessage();
    HttpStatus status = HttpStatus.BAD_REQUEST;
    if (msg != null) {
      if (msg.contains("registered")) {
        status = HttpStatus.CONFLICT;
      } else if (msg.contains("password") || msg.contains("session") ||
                 msg.contains("login") || msg.contains("token")) {
        status = HttpStatus.UNAUTHORIZED;
      }
    }
    return ResponseEntity.status(status).body(Map.of("error", msg));
  }
}
