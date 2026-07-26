#ifndef REDIS_CACHE_H
#define REDIS_CACHE_H

#include <chrono>
#include <dct/WordInfo.h>
#include <memory>
#include <mutex>
#include <nlohmann/json.hpp>
#include <optional>
#include <string>
#include <sw/redis++/redis++.h>

class RedisCache
{
public:
  RedisCache(const std::string &host, int port);

  std::optional<WordInfo> get(int wordId) const;
  void set(int wordId, const WordInfo &info, int ttlSeconds = 3600) const;
  void del(int wordId) const;
  bool isConnected() const;

private:
  static constexpr std::chrono::milliseconds kConnectTimeout{250};
  static constexpr std::chrono::milliseconds kSocketTimeout{250};
  static constexpr std::chrono::seconds kRetryBackoff{5};

  std::string m_host;
  int m_port;
  mutable std::mutex m_mutex;
  mutable std::unique_ptr<sw::redis::Redis> m_redis;
  mutable bool m_connected;
  mutable std::chrono::steady_clock::time_point m_nextRetry{
      std::chrono::steady_clock::time_point{}};

  bool ensureConnected() const;
  void connect() const;
  nlohmann::json wordInfoToJson(const WordInfo &info) const;
  WordInfo jsonToWordInfo(const nlohmann::json &j) const;
  std::string buildKey(int wordId) const;
};

#endif // REDIS_CACHE_H
