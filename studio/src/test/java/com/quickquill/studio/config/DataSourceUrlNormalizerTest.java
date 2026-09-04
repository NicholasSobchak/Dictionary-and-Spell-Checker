package com.quickquill.studio.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class DataSourceUrlNormalizerTest {

  @Test
  void rewritesPostgresSchemeToJdbc() {
    MockEnvironment environment = new MockEnvironment();
    environment
        .getPropertySources()
        .addFirst(
            new org.springframework.core.env.MapPropertySource(
                "dbUrl", java.util.Map.of("spring.datasource.url", "postgres://u:p@host:5432/db")));

    DataSourceUrlNormalizer normalizer = new DataSourceUrlNormalizer();
    normalizer.setEnvironment(environment);
    normalizer.postProcessBeanFactory(null);

    assertThat(environment.getProperty("spring.datasource.url"))
        .isEqualTo("jdbc:postgresql://host:5432/db");
  }

  @Test
  void dropsCredsAndDefaultsPortWhenMissing() {
    MockEnvironment environment = new MockEnvironment();
    environment
        .getPropertySources()
        .addFirst(
            new org.springframework.core.env.MapPropertySource(
                "dbUrl",
                java.util.Map.of(
                    "spring.datasource.url",
                    "postgres://quickquill_db_user:secret@dpg-dadgq5u7bikc73c4c2b0-a/quickquill_db")));

    DataSourceUrlNormalizer normalizer = new DataSourceUrlNormalizer();
    normalizer.setEnvironment(environment);
    normalizer.postProcessBeanFactory(null);

    assertThat(environment.getProperty("spring.datasource.url"))
        .isEqualTo("jdbc:postgresql://dpg-dadgq5u7bikc73c4c2b0-a:5432/quickquill_db");
  }

  @Test
  void leavesJdbcUrlUntouched() {
    MockEnvironment environment = new MockEnvironment();
    String url = "jdbc:postgresql://localhost:5432/quickquill";
    environment
        .getPropertySources()
        .addFirst(
            new org.springframework.core.env.MapPropertySource(
                "dbUrl", java.util.Map.of("spring.datasource.url", url)));

    DataSourceUrlNormalizer normalizer = new DataSourceUrlNormalizer();
    normalizer.setEnvironment(environment);
    normalizer.postProcessBeanFactory(null);

    assertThat(environment.getProperty("spring.datasource.url")).isEqualTo(url);
  }

  @Test
  void noopWithoutUrl() {
    MockEnvironment environment = new MockEnvironment();

    DataSourceUrlNormalizer normalizer = new DataSourceUrlNormalizer();
    normalizer.setEnvironment(environment);
    normalizer.postProcessBeanFactory(null);

    assertThat(environment.getProperty("spring.datasource.url")).isNull();
  }
}
