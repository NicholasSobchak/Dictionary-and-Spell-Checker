#include "app/Config.h"

#include <cstdlib>
#include <fstream>
#include <iostream>

namespace
{
// Env var takes precedence over config.json; falls back to the provided default.
std::string getStringConfig(
    const nlohmann::json &data, const char *envName, const char *key, const std::string &fallback)
{
  if (const char *env = std::getenv(envName); env && *env)
  {
    return std::string(env);
  }
  if (data.contains(key))
  {
    return data[key].get<std::string>();
  }
  return fallback;
}

int getIntConfig(const nlohmann::json &data, const char *envName, const char *key, int fallback)
{
  if (const char *env = std::getenv(envName); env && *env)
  {
    return std::atoi(env);
  }
  if (data.contains(key))
  {
    return data[key].get<int>();
  }
  return fallback;
}
} // namespace

Config::Config()
{
  std::ifstream f("config.json");
  if (f)
  {
    data = nlohmann::json::parse(f);
  }
  else
  {
    std::cerr << "Warning: config.json not found. Using default values.\n";
  }
}

std::string Config::getDatabasePath() const
{
  return getStringConfig(data, "DATABASE_PATH", "database_path", "dictionary.db");
}

int Config::getServerPort() const { return getIntConfig(data, "SERVER_PORT", "server_port", 8080); }
