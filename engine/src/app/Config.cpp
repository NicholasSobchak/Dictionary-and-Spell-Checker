#include "app/Config.h"

#include <cstdlib>
#include <fstream>
#include <iostream>

Config::Config()
{
  std::ifstream f("config.json");
  if (f)
  {
    data = nlohmann::json::parse(f);
  }
  else
  {
    std::cerr << "Warning: config.json not found. Using default "
                 "values.\n";
  }
}

std::string Config::getDatabasePath() const
{
  if (const char *env = std::getenv("DATABASE_PATH"); env && *env)
  {
    return std::string(env);
  }
  if (data.contains("database_path"))
  {
    return data["database_path"].get<std::string>();
  }
  return "dictionary.db"; // Default value
}

int Config::getServerPort() const
{
  if (const char *env = std::getenv("SERVER_PORT"); env && *env)
  {
    return std::atoi(env);
  }
  if (data.contains("server_port"))
  {
    return data["server_port"].get<int>();
  }
  return 8080; // Default value
}

std::string Config::getRedisHost() const
{
  if (const char *env = std::getenv("REDIS_HOST"); env && *env)
  {
    return std::string(env);
  }
  if (data.contains("redis_host"))
  {
    return data["redis_host"].get<std::string>();
  }
  return "redis"; // Default value
}

int Config::getRedisPort() const
{
  if (const char *env = std::getenv("REDIS_PORT"); env && *env)
  {
    return std::atoi(env);
  }
  if (data.contains("redis_port"))
  {
    return data["redis_port"].get<int>();
  }
  return 6379; // Default value
}
