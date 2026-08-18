package com.quickquill.studio.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class NoteControllerTest {

  @Autowired private MockMvc mockMvc;

  private void signup(String email, String password) throws Exception {
    mockMvc
        .perform(
            post("/api/auth/signup")
                .param("email", email)
                .param("password", password)
                .param("displayName", email))
        .andExpect(status().isCreated());
  }

  private String loginAndExtractToken(String email, String password) throws Exception {
    String response =
        mockMvc
            .perform(post("/api/auth/login").param("email", email).param("password", password))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return response.split("\"token\":\"")[1].split("\"")[0];
  }

  @Nested
  @DisplayName("GET /api/note")
  class GetNote {

    @Test
    void shouldReturnEmptyNoteOnFirstVisit() throws Exception {
      signup("note1@test.com", "pass123");
      String token = loginAndExtractToken("note1@test.com", "pass123");

      mockMvc
          .perform(get("/api/note").param("token", token))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.id").isNumber())
          .andExpect(jsonPath("$.content").value(""))
          .andExpect(jsonPath("$.updatedAt").exists());
    }

    @Test
    void shouldReturnSavedContent() throws Exception {
      signup("note2@test.com", "pass123");
      String token = loginAndExtractToken("note2@test.com", "pass123");

      mockMvc.perform(put("/api/note").param("token", token).param("content", "remember this"));

      mockMvc
          .perform(get("/api/note").param("token", token))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.content").value("remember this"));
    }

    @Test
    void shouldReturn401ForInvalidToken() throws Exception {
      mockMvc
          .perform(get("/api/note").param("token", "bogus-token"))
          .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldReturn400ForMissingToken() throws Exception {
      mockMvc.perform(get("/api/note")).andExpect(status().isBadRequest());
    }
  }

  @Nested
  @DisplayName("PUT /api/note")
  class SaveNote {

    @Test
    void shouldSaveContent() throws Exception {
      signup("note3@test.com", "pass123");
      String token = loginAndExtractToken("note3@test.com", "pass123");

      mockMvc
          .perform(put("/api/note").param("token", token).param("content", "hello note"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.id").isNumber())
          .andExpect(jsonPath("$.content").value("hello note"))
          .andExpect(jsonPath("$.updatedAt").exists());
    }

    @Test
    void shouldOverwriteExistingNote() throws Exception {
      signup("note4@test.com", "pass123");
      String token = loginAndExtractToken("note4@test.com", "pass123");

      mockMvc.perform(put("/api/note").param("token", token).param("content", "first"));
      mockMvc.perform(put("/api/note").param("token", token).param("content", "second"));

      mockMvc
          .perform(get("/api/note").param("token", token))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.content").value("second"));
    }

    @Test
    void shouldReturn401ForInvalidToken() throws Exception {
      mockMvc
          .perform(put("/api/note").param("token", "bogus-token").param("content", "x"))
          .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldReturn400ForMissingParams() throws Exception {
      mockMvc
          .perform(put("/api/note").param("token", "whatever"))
          .andExpect(status().isBadRequest());
    }
  }
}
