package com.quickquill.studio.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
    name = "suggested_words",
    uniqueConstraints = {@UniqueConstraint(columnNames = {"user_id", "word"})})
public class SuggestedWord {

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

  public SuggestedWord() {}

  public SuggestedWord(User user, String word) {
    this.user = user;
    this.word = word;
  }

  public Long getId() {
    return id;
  }

  public String getWord() {
    return word;
  }
}
