#ifndef SPELLCHECKER_H
#define SPELLCHECKER_H
#include <string>
#include <vector>

#include "core/Dictionary.h"

class SpellChecker
{
public:
  explicit SpellChecker(const Dictionary &dict);
  ~SpellChecker() = default;

  void dumpList(const std::vector<std::string> &out) const;
  std::vector<std::string> suggest(std::string_view prefix) const;
  std::string correct(std::string_view word) const;
  // NOLINTNEXTLINE(bugprone-easily-swappable-parameters)
  std::string autofill(
      std::string_view word,
      const std::vector<std::string> &history = {},
      const std::vector<std::string> &suggested = {}) const;

private:
  const Dictionary &m_dict;
};

#endif // SPELLCHECKER_H
