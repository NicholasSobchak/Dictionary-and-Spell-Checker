package com.quickquill.studio.controller;

import com.quickquill.studio.config.AuthToken;
import com.quickquill.studio.model.Document;
import com.quickquill.studio.service.DocumentService;
import java.time.Instant;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

  private final DocumentService documentService;

  public DocumentController(DocumentService documentService) {
    this.documentService = documentService;
  }

  /** Wire shape for list entries — never carries content. */
  record DocumentSummary(long id, String title, Instant updatedAt) {
    static DocumentSummary from(Document d) {
      return new DocumentSummary(d.getId(), d.getTitle(), d.getUpdatedAt());
    }
  }

  /** Wire shape for single-document responses. */
  record DocumentResponse(long id, String title, String content, Instant updatedAt) {
    static DocumentResponse from(Document d) {
      return new DocumentResponse(d.getId(), d.getTitle(), d.getContent(), d.getUpdatedAt());
    }
  }

  private record MessageResponse(String message) {}

  /** Returns the authenticated user's documents, most recently updated first. */
  @GetMapping
  public ResponseEntity<List<DocumentSummary>> list(
      @RequestHeader("Authorization") String authorization) {
    List<DocumentSummary> documents =
        documentService.list(AuthToken.fromHeader(authorization)).stream()
            .map(DocumentSummary::from)
            .toList();
    return ResponseEntity.ok(documents);
  }

  /** Creates a new empty document for the authenticated user. Title defaults to "Untitled". */
  @PostMapping
  public ResponseEntity<DocumentResponse> create(
      @RequestHeader("Authorization") String authorization,
      @RequestParam(required = false) String title) {
    Document document =
        documentService.create(AuthToken.fromHeader(authorization), normalizeTitle(title), "");
    return ResponseEntity.ok(DocumentResponse.from(document));
  }

  /** Returns one of the authenticated user's documents with its content. 404 if not theirs. */
  @GetMapping("/{id}")
  public ResponseEntity<DocumentResponse> get(
      @RequestHeader("Authorization") String authorization, @PathVariable long id) {
    Document document = documentService.get(AuthToken.fromHeader(authorization), id);
    return ResponseEntity.ok(DocumentResponse.from(document));
  }

  /** Saves content into one of the authenticated user's documents. */
  @PutMapping("/{id}")
  public ResponseEntity<DocumentResponse> save(
      @RequestHeader("Authorization") String authorization,
      @PathVariable long id,
      @RequestParam String content) {
    Document document = documentService.save(AuthToken.fromHeader(authorization), id, content);
    return ResponseEntity.ok(DocumentResponse.from(document));
  }

  /** Renames one of the authenticated user's documents. */
  @PostMapping("/{id}/rename")
  public ResponseEntity<DocumentResponse> rename(
      @RequestHeader("Authorization") String authorization,
      @PathVariable long id,
      @RequestParam String title) {
    Document document = documentService.rename(AuthToken.fromHeader(authorization), id, title);
    return ResponseEntity.ok(DocumentResponse.from(document));
  }

  /** Deletes one of the authenticated user's documents. */
  @DeleteMapping("/{id}")
  public ResponseEntity<MessageResponse> delete(
      @RequestHeader("Authorization") String authorization, @PathVariable long id) {
    documentService.delete(AuthToken.fromHeader(authorization), id);
    return ResponseEntity.ok(new MessageResponse("Document deleted."));
  }

  private static String normalizeTitle(String title) {
    return title == null || title.isBlank() ? "Untitled" : title.trim();
  }
}
