package com.quickquill.studio.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private String email;

  @Column(nullable = false)
  private String password;

  @Column(nullable = false)
  private String displayName;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  private void onCreate() {
    this.createdAt = Instant.now();
  }

  public User() {}

  public User(String email, String password, String displayName) {
    this.email = email;
    this.password = password;
    this.displayName = displayName;
  }

  public Long getId() {
    return id;
  }

  public String getEmail() {
    return email;
  }

  public String getPassword() {
    return password;
  }

  public String getDisplayName() {
    return displayName;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setPasswordHash(String password) {
    this.password = password;
  }

  public void setDisplayName(String name) {
    this.displayName = name;
  }
}
