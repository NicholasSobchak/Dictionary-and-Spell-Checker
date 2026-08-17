#ifndef HTTP_SERVICES_WORDSERVICE_H
#define HTTP_SERVICES_WORDSERVICE_H

#include "core/Dictionary.h"
#include "core/SpellChecker.h"

#include <string>
#include <vector>

namespace http
{
// Result of any engine operation: the JSON body plus the HTTP status to return.
struct ServiceResult
{
  std::string body;
  int status{200};
};

class WordService
{
public:
  WordService(Dictionary &dict, SpellChecker &checker);

  ServiceResult search(const std::string &word) const;
  ServiceResult suggest(const std::string &word) const;
  ServiceResult suggestSynonym(const std::string &word) const;
  // NOLINTNEXTLINE(bugprone-easily-swappable-parameters)
  ServiceResult autofill(
      const std::string &prefix,
      const std::vector<std::string> &history,
      const std::vector<std::string> &suggested) const;

private:
  Dictionary &m_dict;
  SpellChecker &m_checker;

  // Removes random characters that could potentially corrupt the search query
  static std::string decodeInput(const std::string &in);
};
} // end namespace http

#endif // HTTP_SERVICES_WORDSERVICE_H
