package com.quickquill.studio.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
    name = "search_history",
    uniqueConstraints = {@UniqueConstraint(columnNames = {"user_id", "word"})})
public class SearchHistory {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(nullable = false)
  private String word;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  private void onCreate() {
    this.createdAt = Instant.now();
  }

  public SearchHistory() {}

  public SearchHistory(User user, String word) {
    this.user = user;
    this.word = word;
  }

  public Long getId() {
    return id;
  }

  public User getUser() {
    return user;
  }

  public String getWord() {
    return word;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
