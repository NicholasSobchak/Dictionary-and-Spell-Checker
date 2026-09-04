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
 * ("'url' must start with \"jdbc\"") and whose embedded credentials the JDBC driver cannot parse.
 * This rewrites the resolved spring.datasource.url into a plain jdbc:postgresql://host:port/db URL
 * (credentials come from spring.datasource.username/password), no matter whether it came from the
 * blueprint's per-part env vars (already JDBC) or from a stale raw connection string.
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
    if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) {
      return url;
    }
    String rest = url.substring(url.indexOf("//") + 2);
    int at = rest.lastIndexOf('@');
    if (at != -1) {
      // The JDBC driver cannot parse user:password@host embedded in the URL
      // (it splits the authority on the first colon), so credentials are
      // dropped here and provided via spring.datasource.username/password.
      rest = rest.substring(at + 1);
    }
    String authority = rest;
    String path = "";
    int slash = rest.indexOf('/');
    if (slash != -1) {
      authority = rest.substring(0, slash);
      path = rest.substring(slash);
    }
    // Render's internal connection string is a bare dpg-...-a hostname with no
    // port; make the default port explicit so the driver parses it cleanly.
    if (!authority.contains(":")) {
      authority = authority + ":5432";
    }
    return "jdbc:postgresql://" + authority + path;
  }
}
