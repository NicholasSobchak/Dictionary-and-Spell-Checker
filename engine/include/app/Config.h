#ifndef CONFIG_H
#define CONFIG_H

#include <nlohmann/json.hpp>
#include <string>

class Config
{
public:
  static Config &getInstance()
  {
    static Config instance;
    return instance;
  }

  Config(const Config &) = delete;
  Config operator=(const Config &) = delete;
  Config(Config &&) = delete;
  Config operator=(Config &&) = delete;

  std::string getDatabasePath() const;
  int getServerPort() const;

private:
  Config();
  nlohmann::json data;
};
#endif // CONFIG_H
