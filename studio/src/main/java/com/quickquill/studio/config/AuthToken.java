package com.quickquill.studio.config;

/**
 * Extracts the session token from the {@code Authorization} header. The frontend sends it as {@code
 * Authorization: Bearer <token>}. Keeping the token out of the URL protects it from access logs,
 * browser history, and the Referer header.
 */
public final class AuthToken {

  private static final String BEARER_PREFIX = "Bearer ";

  private AuthToken() {}

  /**
   * Returns the session token from a raw Authorization header value, or an empty string when the
   * header is missing or not a well-formed "Bearer <token>".
   */
  public static String fromHeader(String authorization) {
    if (authorization == null) {
      return "";
    }
    if (!authorization.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
      return "";
    }
    return authorization.substring(BEARER_PREFIX.length()).trim();
  }
}
