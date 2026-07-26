#ifndef HTTP_SERVICES_WORDSERVICE_H
#define HTTP_SERVICES_WORDSERVICE_H

#include "core/Dictionary.h"
#include "core/SpellChecker.h"

#include <string>
#include <vector>

namespace http
{
struct SearchResult
{
  std::string body;
  int status{200};
};

struct SuggestResult
{
  std::string body;
  int status{200};
};

struct SuggestSynonymResult
{
  std::string body;
  int status{200};
};

struct AutofillResult
{
  std::string body;
  int status{200};
};

class WordService
{
public:
  WordService(Dictionary &dict, SpellChecker &checker);

  SearchResult search(const std::string &word) const;
  SuggestResult suggest(const std::string &word) const;
  SuggestSynonymResult suggestSynonym(const std::string &word) const;
  // NOLINTNEXTLINE(bugprone-easily-swappable-parameters)
  AutofillResult autofill(
      const std::string &prefix,
      const std::vector<std::string> &history,
      const std::vector<std::string> &suggested) const;
  void warmupDictionary() const;

private:
  Dictionary &m_dict;
  SpellChecker &m_checker;

  // Removes random characters that could potentially corrupt the search query
  static std::string decodeInput(const std::string &in);
};

WordService &wordService();
void warmupDictionary();
} // end namespace http

#endif // HTTP_SERVICES_WORDSERVICE_H
