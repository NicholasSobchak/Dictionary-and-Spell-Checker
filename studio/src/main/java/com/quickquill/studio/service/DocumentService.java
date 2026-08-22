package com.quickquill.studio.service;

import com.quickquill.studio.model.Document;
import com.quickquill.studio.model.User;
import com.quickquill.studio.repository.DocumentRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DocumentService {

  private final AuthService authService;
  private final DocumentRepository documentRepository;

  public DocumentService(AuthService authService, DocumentRepository documentRepository) {
    this.authService = authService;
    this.documentRepository = documentRepository;
  }

  /** Returns the authenticated user's documents, most recently updated first. */
  public List<Document> list(String token) {
    User user = authService.validateSession(token);
    return documentRepository.findByUserOrderByUpdatedAtDesc(user);
  }

  /** Creates a document owned by the authenticated user. */
  public Document create(String token, String title, String content) {
    User user = authService.validateSession(token);
    return documentRepository.save(new Document(user, title, content));
  }

  /**
   * Returns one of the authenticated user's documents by id. The id is always paired with the
   * token's user, so foreign and missing documents are indistinguishable — both 404.
   */
  public Document get(String token, long documentId) {
    User user = authService.validateSession(token);
    return findOwnedDocument(user, documentId);
  }

  /** Saves new content into one of the authenticated user's documents. */
  public Document save(String token, long documentId, String content) {
    User user = authService.validateSession(token);
    Document document = findOwnedDocument(user, documentId);
    document.setContent(content);
    return documentRepository.save(document);
  }

  /** Renames one of the authenticated user's documents. */
  public Document rename(String token, long documentId, String newTitle) {
    User user = authService.validateSession(token);
    Document document = findOwnedDocument(user, documentId);
    document.setTitle(newTitle);
    return documentRepository.save(document);
  }

  /** Deletes one of the authenticated user's documents. */
  public void delete(String token, long documentId) {
    User user = authService.validateSession(token);
    Document document = findOwnedDocument(user, documentId);
    documentRepository.delete(document);
  }

  private Document findOwnedDocument(User user, long documentId) {
    return documentRepository
        .findByIdAndUser(documentId, user)
        .orElseThrow(
            () ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Document not found or access denied"));
  }
}
