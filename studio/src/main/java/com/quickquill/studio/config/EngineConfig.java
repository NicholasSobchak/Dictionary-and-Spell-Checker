package com.quickquill.studio.config;

import com.quickquill.studio.engine.WordEngine;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Loads the native C++ engine library on application startup and initializes the
 * Dictionary/SpellChecker. Shuts it down on context close.
 */
@Configuration
public class EngineConfig {

  @Value("${quickquill.dictionary-path:../dictionary.db}")
  private String dictionaryPath;

  @PostConstruct
  public void init() {
    System.loadLibrary("quickquill_engine");
    WordEngine.init(dictionaryPath);
  }

  @PreDestroy
  public void shutdown() {
    WordEngine.shutdown();
  }
}
