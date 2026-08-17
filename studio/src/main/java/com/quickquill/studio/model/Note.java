package com.quickquill.studio.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
    name = "notes",
    uniqueConstraints = {@UniqueConstraint(columnNames = "user_id")})
public class Note {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(nullable = false, columnDefinition = "text")
  private String content = "";

  @Column(nullable = false)
  private Instant updatedAt;

  public Note() {}

  public Note(User user) {
    this.user = user;
    this.updatedAt = Instant.now();
  }

  public Long getId() {
    return id;
  }

  public User getUser() {
    return user;
  }

  public String getContent() {
    return content;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setContent(String content) {
    this.content = content;
    this.updatedAt = Instant.now();
  }
}
