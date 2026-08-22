package com.quickquill.studio.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "documents")
public class Document {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(nullable = false)
  private String title = "Untitled";

  @Column(nullable = false, columnDefinition = "text")
  private String content = "";

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  @Column(nullable = false)
  private Instant updatedAt;

  @PrePersist
  private void onCreate() {
    Instant now = Instant.now();
    this.createdAt = now;
    this.updatedAt = now;
  }

  public Document() {}

  public Document(User user) {
    this.user = user;
    this.title = "Untitled";
    this.updatedAt = Instant.now();
  }

  public Document(User user, String title, String content) {
    this.user = user;
    this.title = title;
    this.content = content;
    this.updatedAt = Instant.now();
  }

  public Long getId() {
    return id;
  }

  public User getUser() {
    return user;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
    this.updatedAt = Instant.now();
  }

  public String getContent() {
    return content;
  }

  public void setContent(String content) {
    this.content = content;
    this.updatedAt = Instant.now();
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
