package com.quickquill.studio.config;

import java.util.Map;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.EnvironmentAware;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.Environment;
import org.springframework.core.env.MapPropertySource;

/**
 * Rewrites a Render database connection string (postgres://...) into a JDBC URL
 * (jdbc:postgresql://...) before Spring creates the DataSource.
 *
 * <p>Render's fromDatabase connectionString uses the libpq postgres:// scheme, which Hikari rejects
 * ("'url' must start with \"jdbc\""). This normalizes the resolved spring.datasource.url no matter
 * whether it came from the blueprint's per-part env vars (already JDBC) or from a stale raw
 * connection string.
 */
@Configuration
public class DataSourceUrlNormalizer implements EnvironmentAware, BeanFactoryPostProcessor {

  private Environment environment;

  @Override
  public void setEnvironment(Environment environment) {
    this.environment = environment;
  }

  @Override
  public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory)
      throws BeansException {
    if (!(environment instanceof ConfigurableEnvironment configurableEnvironment)) {
      return;
    }
    String url = configurableEnvironment.getProperty("spring.datasource.url");
    if (url == null) {
      return;
    }
    String normalized = normalize(url);
    if (!normalized.equals(url)) {
      configurableEnvironment
          .getPropertySources()
          .addFirst(
              new MapPropertySource(
                  "normalizedDataSourceUrl", Map.of("spring.datasource.url", normalized)));
    }
  }

  static String normalize(String url) {
    if (url.startsWith("postgres://")) {
      return "jdbc:postgresql://" + url.substring("postgres://".length());
    }
    if (url.startsWith("postgresql://")) {
      return "jdbc:postgresql://" + url.substring("postgresql://".length());
    }
    return url;
  }
}
